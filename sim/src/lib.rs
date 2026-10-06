//! WASM simulation core (ADR 0005, stage 2): the car, aeroplane and on-foot simulations of the World Studio
//! (dist/globe/car.js, dist/kart/plane.js, dist/kart/pedestrian.js) ported to f32, running on entity records in
//! linear memory laid out exactly like contracts/sim-state-v1.md (64 bytes, WGSL-compatible). No allocation per
//! step: entities, inputs, internal state and the terrain height grid are static arrays that JavaScript reads and
//! writes through the exported pointers. Same binary in the browser and in the Worker → identical results everywhere.

#![allow(static_mut_refs)]
use core::f32::consts::PI;

pub const CAP: usize = 256;
pub const GRID_MAX: usize = 1_000_000;
const TAU: f32 = PI * 2.0;

pub const MODE_NONE: u32 = 0;
pub const MODE_KART: u32 = 1;
pub const MODE_PLANE: u32 = 2;
pub const MODE_WALK: u32 = 3;
pub const MODE_CAR: u32 = 4;
pub const FLAG_ACTIVE: u32 = 1 << 8;
pub const FLAG_ON_GROUND: u32 = 1 << 9;
pub const FLAG_CRASHED: u32 = 1 << 10;
pub const FLAG_STALLED: u32 = 1 << 11;

/// Sim state layout v1 — 64 bytes, vec3 fields at 16-byte offsets like the WGSL struct.
#[repr(C, align(16))]
#[derive(Clone, Copy)]
pub struct Entity {
    pub id: u32,
    pub flags: u32,
    pub tick: u32,
    pub _pad0: u32,
    pub pos: [f32; 3],
    pub _pad1: f32,
    pub vel: [f32; 3],
    pub _pad2: f32,
    pub heading: f32,
    pub pitch: f32,
    pub roll: f32,
    pub mutation: u32,
}
const _: () = assert!(core::mem::size_of::<Entity>() == 64);

/// Per-entity input for the next steps (16 bytes).
/// car:   a = throttle −1…1, b = steer −1…1, buttons bit 0 = handbrake
/// walk:  a = forward, b = strafe, c = turn, buttons bit 0 = run, bit 1 = jump (cleared after one step)
/// plane: a = pitch, b = roll, c = yaw, buttons bit 0 = more power, bit 1 = less power
#[repr(C)]
#[derive(Clone, Copy)]
pub struct Input {
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub buttons: u32,
}
const _: () = assert!(core::mem::size_of::<Input>() == 16);

#[derive(Clone, Copy)]
struct Extra {
    speed: f32,
    vy: f32,
    throttle: f32,
    hold: f32,
    was_stopped: bool,
}

const ZERO_ENTITY: Entity = Entity { id: 0, flags: 0, tick: 0, _pad0: 0, pos: [0.0; 3], _pad1: 0.0, vel: [0.0; 3], _pad2: 0.0, heading: 0.0, pitch: 0.0, roll: 0.0, mutation: 0 };
const ZERO_INPUT: Input = Input { a: 0.0, b: 0.0, c: 0.0, buttons: 0 };
const ZERO_EXTRA: Extra = Extra { speed: 0.0, vy: 0.0, throttle: 0.0, hold: 0.0, was_stopped: false };

static mut ENTITIES: [Entity; CAP] = [ZERO_ENTITY; CAP];
static mut INPUTS: [Input; CAP] = [ZERO_INPUT; CAP];
static mut EXTRA: [Extra; CAP] = [ZERO_EXTRA; CAP];
static mut HEIGHT: [u16; GRID_MAX] = [0; GRID_MAX];
static mut TERRAIN: Terrain = Terrain { w: 0, d: 0, cell: 1.0, scale: 0.01 };
static mut TICK: u32 = 0;

#[derive(Clone, Copy)]
struct Terrain {
    w: usize,
    d: usize,
    cell: f32,
    scale: f32,
}

/// Bilinear height like the kart page's terrainSampler (grid centred on the map origin, clamped at the edge).
fn ground(x: f32, z: f32) -> f32 {
    let t = unsafe { TERRAIN };
    if t.w < 2 || t.d < 2 {
        return 0.0;
    }
    let gx = (x / t.cell + t.w as f32 / 2.0).max(0.0).min(t.w as f32 - 1.001);
    let gz = (z / t.cell + t.d as f32 / 2.0).max(0.0).min(t.d as f32 - 1.001);
    let (i, j) = (gx as usize, gz as usize);
    let (u, v) = (gx - i as f32, gz - j as f32);
    let h = |a: usize, b: usize| unsafe { HEIGHT[b * t.w + a] } as f32 * t.scale;
    (h(i, j) * (1.0 - u) + h(i + 1, j) * u) * (1.0 - v) + (h(i, j + 1) * (1.0 - u) + h(i + 1, j + 1) * u) * v
}

fn wrap(a: f32) -> f32 {
    ((a + PI) % TAU + TAU) % TAU - PI
}
fn clamp(v: f32, a: f32, b: f32) -> f32 {
    v.max(a).min(b)
}
fn sign(v: f32) -> f32 {
    if v > 0.0 { 1.0 } else if v < 0.0 { -1.0 } else { 0.0 }
}

// ---------------------------------------------------------------- car (dist/globe/car.js)
mod car {
    pub const MAX_SPEED: f32 = 55.0;
    pub const MAX_REVERSE: f32 = 8.0;
    pub const ACCEL: f32 = 7.0;
    pub const BRAKE: f32 = 14.0;
    pub const DRAG: f32 = 0.0021;
    pub const ROLLING: f32 = 0.6;
    pub const WHEELBASE: f32 = 2.7;
    pub const MAX_STEER: f32 = 0.6;
    pub const STEER_FADE: f32 = 0.035;
    pub const GRAVITY: f32 = 9.81;
    pub const SNAP: f32 = 0.6;
    pub const MAX_GRADE: f32 = 0.7;
    pub const PROBE: f32 = 2.0;
    pub const REVERSE_HOLD: f32 = 0.6;
}

fn car_slope(e: &Entity) -> f32 {
    let (fx, fz) = (e.heading.sin(), -e.heading.cos());
    let p = car::PROBE;
    (ground(e.pos[0] + fx * p, e.pos[2] + fz * p) - ground(e.pos[0] - fx * p, e.pos[2] - fz * p)).atan2(2.0 * p)
}

fn step_car(e: &mut Entity, x: &mut Extra, inp: &Input, dt: f32) {
    let (throttle, steer, handbrake) = (inp.a, inp.b, inp.buttons & 1 != 0);
    let on_ground = e.flags & FLAG_ON_GROUND != 0;
    if on_ground {
        let mut a = 0.0;
        if throttle > 0.0 {
            a = if x.speed >= 0.0 { throttle * car::ACCEL } else { throttle * car::BRAKE };
        } else if throttle < 0.0 {
            a = if x.speed > 0.5 { throttle * car::BRAKE } else { throttle * car::ACCEL * 0.6 };
        }
        a -= sign(x.speed) * (car::ROLLING + car::DRAG * x.speed * x.speed);
        a -= car::GRAVITY * e.pitch.sin();
        if handbrake {
            a -= sign(x.speed) * car::BRAKE * 1.2;
        }
        let pushing = (throttle < 0.0 && x.speed <= 0.0) || (throttle > 0.0 && x.speed >= 0.0);
        if x.speed == 0.0 && pushing {
            x.hold += dt;
            if x.hold < car::REVERSE_HOLD && x.was_stopped {
                a = 0.0;
            }
        } else {
            x.hold = 0.0;
        }
        let before = x.speed;
        x.speed = clamp(x.speed + a * dt, -car::MAX_REVERSE, car::MAX_SPEED);
        if before != 0.0 && sign(before) != sign(x.speed) {
            x.speed = 0.0;
            x.was_stopped = throttle != 0.0 && sign(throttle) != sign(before);
            x.hold = 0.0;
        }
        if x.speed != 0.0 && before == 0.0 {
            x.was_stopped = false;
        }
        if x.speed.abs() < 0.05 && throttle == 0.0 {
            x.speed = 0.0;
        }
        let wheel = steer * car::MAX_STEER / (1.0 + car::STEER_FADE * x.speed.abs());
        e.heading = wrap(e.heading + x.speed / car::WHEELBASE * wheel.tan() * dt);
    }
    let (fx, fz) = (e.heading.sin(), -e.heading.cos());
    let (nx, nz) = (e.pos[0] + fx * x.speed * dt, e.pos[2] + fz * x.speed * dt);
    let dir = if x.speed == 0.0 { 1.0 } else { sign(x.speed) };
    let grade = (ground(nx + fx * car::PROBE * dir, nz + fz * car::PROBE * dir) - ground(nx, nz)) / car::PROBE * dir;
    if on_ground && grade > car::MAX_GRADE && x.speed.abs() > 0.1 {
        x.speed = 0.0;
        return;
    }
    e.pos[0] = nx;
    e.pos[2] = nz;
    let floor = ground(nx, nz);
    let mut grounded = on_ground;
    if grounded {
        let follow = (floor - e.pos[1]) / dt;
        let needed = (follow - x.vy) / dt;
        if needed < -car::GRAVITY || e.pos[1] - floor > car::SNAP {
            grounded = false;
        } else {
            e.pos[1] = floor;
            x.vy = follow;
            e.pitch = car_slope(e);
        }
    }
    if !grounded {
        x.vy -= car::GRAVITY * dt;
        e.pos[1] += x.vy * dt;
        if e.pos[1] <= floor {
            e.pos[1] = floor;
            x.vy = 0.0;
            grounded = true;
            e.pitch = car_slope(e);
        }
    }
    set_flag(e, FLAG_ON_GROUND, grounded);
}

// ---------------------------------------------------------------- on foot (dist/kart/pedestrian.js, no walls)
mod foot {
    pub const WALK: f32 = 1.6;
    pub const RUN: f32 = 4.2;
    pub const TURN_RATE: f32 = 2.2;
    pub const JUMP: f32 = 4.6;
    pub const GRAVITY: f32 = 9.81;
    pub const MAX_STEP: f32 = 0.45;
    pub const MAX_SLOPE: f32 = 1.2;
    pub const PROBE: f32 = 0.5;
}

fn walk_can_move(e: &Entity, on_ground: bool, x: f32, z: f32) -> bool {
    let run = ((x - e.pos[0]).powi(2) + (z - e.pos[2]).powi(2)).sqrt().max(1e-6);
    let (ux, uz) = ((x - e.pos[0]) / run, (z - e.pos[2]) / run);
    let here = ground(e.pos[0], e.pos[2]);
    let ahead = ground(e.pos[0] + ux * foot::PROBE, e.pos[2] + uz * foot::PROBE);
    if on_ground && (ahead - here) / foot::PROBE > foot::MAX_SLOPE {
        return false;
    }
    if on_ground && ground(x, z) - e.pos[1] > foot::MAX_STEP {
        return false;
    }
    if !on_ground && e.pos[1] < ground(x, z) - 0.05 {
        return false;
    }
    true
}

fn step_walk(e: &mut Entity, x: &mut Extra, inp: &mut Input, dt: f32) {
    let (forward, strafe, turn) = (inp.a, inp.b, inp.c);
    let (run, jump) = (inp.buttons & 1 != 0, inp.buttons & 2 != 0);
    inp.buttons &= !2; // jump is one press
    e.heading = wrap(e.heading + turn * foot::TURN_RATE * dt);
    let (s, c) = (e.heading.sin(), e.heading.cos());
    let (mut mx, mut mz) = (s * forward + c * strafe, -c * forward + s * strafe);
    let len = (mx * mx + mz * mz).sqrt();
    if len > 1.0 {
        mx /= len;
        mz /= len;
    }
    let speed = if run { foot::RUN } else { foot::WALK };
    let (dx, dz) = (mx * speed * dt, mz * speed * dt);
    let mut on_ground = e.flags & FLAG_ON_GROUND != 0;
    let (px, pz) = (e.pos[0], e.pos[2]);
    let mut moved = false;
    for (ax, az) in [(dx, dz), (dx, 0.0), (0.0, dz)] {
        if ax == 0.0 && az == 0.0 {
            continue;
        }
        if walk_can_move(e, on_ground, e.pos[0] + ax, e.pos[2] + az) {
            e.pos[0] += ax;
            e.pos[2] += az;
            moved = true;
            break;
        }
    }
    x.speed = if moved { ((e.pos[0] - px).powi(2) + (e.pos[2] - pz).powi(2)).sqrt() / dt } else { 0.0 };
    let floor = ground(e.pos[0], e.pos[2]);
    if on_ground && jump {
        x.vy = foot::JUMP;
        on_ground = false;
    }
    if on_ground {
        if e.pos[1] - floor > foot::MAX_STEP {
            on_ground = false;
            x.vy = 0.0;
        } else {
            e.pos[1] = floor;
        }
    }
    if !on_ground {
        x.vy -= foot::GRAVITY * dt;
        e.pos[1] += x.vy * dt;
        if e.pos[1] <= floor {
            e.pos[1] = floor;
            x.vy = 0.0;
            on_ground = true;
        }
    }
    set_flag(e, FLAG_ON_GROUND, on_ground);
}

// ---------------------------------------------------------------- aeroplane (dist/kart/plane.js)
mod plane {
    pub const CRUISE: f32 = 38.0;
    pub const DEFAULT_THROTTLE: f32 = 0.55;
    pub const MAX_SPEED: f32 = 75.0;
    pub const STALL: f32 = 16.0;
    pub const TAKEOFF: f32 = 20.0;
    pub const THRUST_ACCEL: f32 = 7.0;
    pub const PITCH_RATE: f32 = 0.9;
    pub const ROLL_RATE: f32 = 1.8;
    pub const MAX_BANK: f32 = 1.05;
    pub const MAX_PITCH: f32 = 1.05;
    pub const YAW_RATE: f32 = 0.35;
    pub const GRAVITY: f32 = 9.81;
    pub const WHEEL_HEIGHT: f32 = 1.1;
    pub const LANDING_SINK: f32 = 4.0;
    pub const LANDING_BANK: f32 = 0.3;
    pub const GROUND_FRICTION: f32 = 4.0;
}

fn step_plane(e: &mut Entity, x: &mut Extra, inp: &Input, dt: f32) {
    if e.flags & FLAG_CRASHED != 0 {
        return;
    }
    let (pitch_in, roll_in, yaw_in) = (inp.a, inp.b, inp.c);
    let throttle_in = (if inp.buttons & 1 != 0 { 1.0 } else { 0.0 }) - (if inp.buttons & 2 != 0 { 1.0 } else { 0.0 });
    let prev_y = e.pos[1];
    let mut on_ground = e.flags & FLAG_ON_GROUND != 0;
    x.throttle = clamp(x.throttle + throttle_in * 0.5 * dt, 0.0, 1.0);
    let target = if on_ground { x.throttle * plane::MAX_SPEED } else { plane::MAX_SPEED * 0.18 + x.throttle * (plane::MAX_SPEED * 0.82) };
    let authority = clamp(x.speed / plane::CRUISE, 0.25, 1.2);
    x.speed += clamp(target - x.speed, -plane::THRUST_ACCEL, plane::THRUST_ACCEL) * dt - plane::GRAVITY * e.pitch.sin() * dt;
    if on_ground {
        x.speed -= sign(x.speed) * x.speed.abs().min(plane::GROUND_FRICTION * (1.0 - x.throttle) * dt);
    }
    x.speed = clamp(x.speed, 0.0, plane::MAX_SPEED);
    let stalled = !on_ground && x.speed < plane::STALL;
    if on_ground {
        e.roll += clamp(-e.roll, -plane::ROLL_RATE * dt, plane::ROLL_RATE * dt);
        e.heading = wrap(e.heading + (roll_in + yaw_in) * 0.6 * dt * (x.speed / 8.0).min(1.0));
        e.pitch = if pitch_in > 0.0 && x.speed >= plane::TAKEOFF { (e.pitch + plane::PITCH_RATE * 0.5 * dt).min(0.25) } else { (e.pitch - plane::PITCH_RATE * dt).max(0.0) };
    } else {
        e.roll += clamp(roll_in * plane::MAX_BANK - e.roll, -plane::ROLL_RATE * dt, plane::ROLL_RATE * dt);
        e.pitch = clamp(e.pitch + pitch_in * plane::PITCH_RATE * authority * e.roll.cos() * dt, -plane::MAX_PITCH, plane::MAX_PITCH);
        e.heading = wrap(e.heading + (plane::GRAVITY * e.roll.tan() / x.speed.max(plane::STALL) + yaw_in * plane::YAW_RATE) * dt);
        if stalled {
            e.pitch = (e.pitch - (plane::STALL - x.speed) * 0.08 * dt * 4.0).max(-plane::MAX_PITCH);
        }
    }
    let c = e.pitch.cos();
    let (fx, fy, fz) = (e.heading.sin() * c, e.pitch.sin(), -e.heading.cos() * c);
    let sink = if stalled { (plane::STALL - x.speed) * 0.6 } else { 0.0 };
    e.pos[0] += fx * x.speed * dt;
    e.pos[2] += fz * x.speed * dt;
    x.vy = fy * x.speed - sink;
    e.pos[1] += x.vy * dt;
    let floor = ground(e.pos[0], e.pos[2]) + plane::WHEEL_HEIGHT;
    if e.pos[1] <= floor {
        let gentle = x.vy > -plane::LANDING_SINK && e.roll.abs() < plane::LANDING_BANK && e.pitch > -0.2 && floor - prev_y < 1.5;
        e.pos[1] = floor;
        if on_ground || gentle {
            on_ground = true;
            x.vy = 0.0;
            e.pitch = e.pitch.max(0.0);
        } else {
            set_flag(e, FLAG_CRASHED, true);
        }
    } else if on_ground && ((x.vy > 0.5 && x.speed >= plane::TAKEOFF) || e.pos[1] > floor + 0.3) {
        on_ground = false;
    } else if on_ground {
        e.pos[1] = floor;
    }
    set_flag(e, FLAG_ON_GROUND, on_ground);
    set_flag(e, FLAG_STALLED, stalled);
}

fn set_flag(e: &mut Entity, flag: u32, on: bool) {
    if on { e.flags |= flag } else { e.flags &= !flag }
}

// ---------------------------------------------------------------- exports (C ABI for JavaScript and the Worker)
#[no_mangle]
pub extern "C" fn sim_entity_bytes() -> u32 { 64 }
#[no_mangle]
pub extern "C" fn sim_capacity() -> u32 { CAP as u32 }
#[no_mangle]
pub extern "C" fn sim_entities() -> *mut Entity { unsafe { ENTITIES.as_mut_ptr() } }
#[no_mangle]
pub extern "C" fn sim_inputs() -> *mut Input { unsafe { INPUTS.as_mut_ptr() } }
#[no_mangle]
pub extern "C" fn sim_height() -> *mut u16 { unsafe { HEIGHT.as_mut_ptr() } }
#[no_mangle]
pub extern "C" fn sim_tick() -> u32 { unsafe { TICK } }

/// Terrain after filling sim_height(): w × d values, `cell` metres apart, height = value × scale. → ok?
#[no_mangle]
pub extern "C" fn sim_set_terrain(w: u32, d: u32, cell: f32, scale: f32) -> u32 {
    // checked_mul: on wasm32 usize is 32 bits, so 65536 × 65536 would wrap to 0 and pass a plain comparison.
    match (w as usize).checked_mul(d as usize) { Some(n) if n <= GRID_MAX && w >= 2 && d >= 2 => {} _ => return 0 }
    unsafe { TERRAIN = Terrain { w: w as usize, d: d as usize, cell, scale }; }
    1
}

#[no_mangle]
pub extern "C" fn sim_ground(x: f32, z: f32) -> f32 { ground(x, z) }

/// Places entity `slot` on the ground (plane: `height` metres above it, at cruise speed).
#[no_mangle]
pub extern "C" fn sim_spawn(slot: u32, id: u32, mode: u32, x: f32, z: f32, heading: f32, height: f32) -> u32 {
    let s = slot as usize;
    if s >= CAP || mode == MODE_NONE || mode > MODE_CAR { return 0; }
    unsafe {
        let e = &mut ENTITIES[s];
        *e = ZERO_ENTITY;
        e.id = id;
        e.flags = mode | FLAG_ACTIVE;
        e.pos = [x, ground(x, z), z];
        e.heading = heading;
        EXTRA[s] = ZERO_EXTRA;
        INPUTS[s] = ZERO_INPUT;
        if mode == MODE_PLANE {
            e.pos[1] += height;
            EXTRA[s].speed = plane::CRUISE;
            EXTRA[s].throttle = plane::DEFAULT_THROTTLE;
        } else {
            e.flags |= FLAG_ON_GROUND;
            if mode == MODE_WALK { e.pitch = -0.08; } else { e.pitch = car_slope(e); }
        }
    }
    1
}

#[no_mangle]
pub extern "C" fn sim_despawn(slot: u32) {
    if (slot as usize) < CAP { unsafe { ENTITIES[slot as usize] = ZERO_ENTITY; } }
}

/// Advances the first `count` slots by `steps` fixed steps of `dt` seconds; writes velocity and tick back.
#[no_mangle]
pub extern "C" fn sim_step(dt: f32, steps: u32, count: u32) {
    let n = (count as usize).min(CAP);
    unsafe {
        for _ in 0..steps {
            TICK = TICK.wrapping_add(1);
            for s in 0..n {
                let e = &mut ENTITIES[s];
                if e.flags & FLAG_ACTIVE == 0 { continue; }
                let before = e.pos;
                let (x, inp) = (&mut EXTRA[s], &mut INPUTS[s]);
                match e.flags & 0xf {
                    MODE_CAR | MODE_KART => step_car(e, x, inp, dt),
                    MODE_WALK => step_walk(e, x, inp, dt),
                    MODE_PLANE => step_plane(e, x, inp, dt),
                    _ => {}
                }
                e.vel = [(e.pos[0] - before[0]) / dt, (e.pos[1] - before[1]) / dt, (e.pos[2] - before[2]) / dt];
                e.tick = TICK;
            }
        }
    }
}

/// Signed speed of slot (m/s) — kept internally, not part of the 64-byte record.
#[no_mangle]
pub extern "C" fn sim_speed(slot: u32) -> f32 {
    if (slot as usize) < CAP { unsafe { EXTRA[slot as usize].speed } } else { 0.0 }
}
