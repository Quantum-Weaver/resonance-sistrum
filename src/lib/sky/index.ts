// Sky facts, computed offline, no API ever: moon phase to ~hours, solstices/equinoxes to ~minutes, planet longitudes to a few degrees.

// ——— the clock's common ground ———

/** Julian day for a Date (UTC). */
export function julianDay(date: Date): number {
	let y = date.getUTCFullYear();
	let m = date.getUTCMonth() + 1;
	const d =
		date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;
	if (m <= 2) {
		y -= 1;
		m += 12;
	}
	const a = Math.floor(y / 100);
	const b = 2 - a + Math.floor(a / 4);
	return (
		Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5
	);
}

// ——— 🌙 moon-phases ———

const SYNODIC = 29.530588853;
const NEW_EPOCH = 2451550.09766; // 2000-01-06 18:14 UTC, a new moon

export const MOON_PHASES = [
	'new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
	'full moon', 'waning gibbous', 'last quarter', 'waning crescent',
] as const;

export const MOON_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] as const;

export interface MoonReading {
	phase: (typeof MOON_PHASES)[number];
	emoji: (typeof MOON_EMOJI)[number];
	/** 0..1 — how much of the face is lit */
	illumination: number;
	/** days since the new moon */
	ageDays: number;
	daysToFull: number;
	daysToNew: number;
}

export function moonPhase(date: Date): MoonReading {
	const age = (((julianDay(date) - NEW_EPOCH) % SYNODIC) + SYNODIC) % SYNODIC;
	const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
	const idx = Math.floor((age / SYNODIC) * 8 + 0.5) % 8;
	return {
		phase: MOON_PHASES[idx],
		emoji: MOON_EMOJI[idx],
		illumination,
		ageDays: age,
		daysToFull: (SYNODIC / 2 - age + SYNODIC) % SYNODIC,
		daysToNew: (SYNODIC - age) % SYNODIC,
	};
}

// ——— 🎡 ancient-holidays (the wheel of the year) ———

/** Meeus approximation. which: 0=Mar equinox · 1=Jun · 2=Sep · 3=Dec. */
export function equinoxSolstice(year: number, which: 0 | 1 | 2 | 3): Date {
	const Y = (year - 2000) / 1000;
	const t = [
		[2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
		[2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003],
		[2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
		[2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
	][which];
	const jde = t[0] + t[1] * Y + t[2] * Y ** 2 + t[3] * Y ** 3 + t[4] * Y ** 4;
	// JD → Gregorian (day precision is plenty here)
	const z = Math.floor(jde + 0.5);
	const f = jde + 0.5 - z;
	const al = Math.floor((z - 1867216.25) / 36524.25);
	const aa = z + 1 + al - Math.floor(al / 4);
	const bb = aa + 1524;
	const cc = Math.floor((bb - 122.1) / 365.25);
	const dd = Math.floor(365.25 * cc);
	const ee = Math.floor((bb - dd) / 30.6001);
	const day = bb - dd - Math.floor(30.6001 * ee) + f;
	const month = ee < 14 ? ee - 1 : ee - 13;
	const yr = month > 2 ? cc - 4716 : cc - 4715;
	return new Date(Date.UTC(yr, month - 1, Math.floor(day)));
}

export interface WheelSpoke {
	name: string;
	date: Date;
	/** 'traditional' = the calendar date tradition keeps · 'computed' = the sky's own moment */
	kind: 'traditional' | 'computed';
}

/** The eight spokes for a year: cross-quarters by tradition, quarters computed. */
export function wheelOfYear(year: number): WheelSpoke[] {
	return [
		{ name: 'Imbolc', date: new Date(Date.UTC(year, 1, 1)), kind: 'traditional' },
		{ name: 'Ostara', date: equinoxSolstice(year, 0), kind: 'computed' },
		{ name: 'Beltane', date: new Date(Date.UTC(year, 4, 1)), kind: 'traditional' },
		{ name: 'Litha', date: equinoxSolstice(year, 1), kind: 'computed' },
		{ name: 'Lughnasadh', date: new Date(Date.UTC(year, 7, 1)), kind: 'traditional' },
		{ name: 'Mabon', date: equinoxSolstice(year, 2), kind: 'computed' },
		{ name: 'Samhain', date: new Date(Date.UTC(year, 9, 31)), kind: 'traditional' },
		{ name: 'Yule', date: equinoxSolstice(year, 3), kind: 'computed' },
	];
}

export interface SeasonReading {
	after: { name: string; daysAgo: number };
	next: { name: string; daysUntil: number; date: Date; kind: WheelSpoke['kind'] };
}

export function season(date: Date): SeasonReading {
	const spokes = [
		...wheelOfYear(date.getUTCFullYear() - 1),
		...wheelOfYear(date.getUTCFullYear()),
		...wheelOfYear(date.getUTCFullYear() + 1),
	];
	const t = date.getTime();
	const past = spokes.filter((s) => s.date.getTime() <= t);
	const future = spokes.filter((s) => s.date.getTime() > t);
	const last = past[past.length - 1];
	const next = future[0];
	const DAY = 86_400_000;
	return {
		after: { name: last.name, daysAgo: Math.floor((t - last.date.getTime()) / DAY) },
		next: {
			name: next.name,
			daysUntil: Math.ceil((next.date.getTime() - t) / DAY),
			date: next.date,
			kind: next.kind,
		},
	};
}

// ——— 🪐 planets-alignment ———

// mean elements at J2000: [longitude deg, deg/day, orbit radius AU]
const PLANETS: Record<string, [number, number, number]> = {
	Mercury: [252.25084, 4.0923388, 0.387],
	Venus: [181.97973, 1.60213047, 0.723],
	Mars: [355.45332, 0.52403304, 1.524],
	Jupiter: [34.40438, 0.08308676, 5.203],
	Saturn: [49.94432, 0.03346063, 9.537],
};
const EARTH: [number, number, number] = [100.46435, 0.9856091, 1.0];

export const ZODIAC_SIGNS = [
	'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra',
	'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export interface PlanetReading {
	planet: string;
	/** geocentric ecliptic longitude, degrees (±a few) */
	longitude: number;
	sign: (typeof ZODIAC_SIGNS)[number];
}

export function planets(date: Date): PlanetReading[] {
	const d = julianDay(date) - 2451545.0;
	const rad = (deg: number) => (deg * Math.PI) / 180;
	const ex = EARTH[2] * Math.cos(rad(EARTH[0] + EARTH[1] * d));
	const ey = EARTH[2] * Math.sin(rad(EARTH[0] + EARTH[1] * d));
	return Object.entries(PLANETS).map(([planet, [l0, rate, r]]) => {
		const L = rad(l0 + rate * d);
		const gx = r * Math.cos(L) - ex;
		const gy = r * Math.sin(L) - ey;
		const longitude = ((Math.atan2(gy, gx) * 180) / Math.PI + 360) % 360;
		return { planet, longitude, sign: ZODIAC_SIGNS[Math.floor(longitude / 30) % 12] };
	});
}

export interface Meeting {
	a: string;
	b: string;
	/** degrees apart */
	separation: number;
}

/** Wanderers standing together — pairs within the orb (default 6°). */
export function meetings(date: Date, orbDegrees = 6): Meeting[] {
	const lons = planets(date);
	const out: Meeting[] = [];
	for (let i = 0; i < lons.length; i++) {
		for (let j = i + 1; j < lons.length; j++) {
			const sep = Math.abs(
				((lons[i].longitude - lons[j].longitude + 180) % 360) - 180
			);
			if (sep < orbDegrees) out.push({ a: lons[i].planet, b: lons[j].planet, separation: sep });
		}
	}
	return out;
}

// ——— the whole sky, one reading ———

export interface SkyReading {
	moon: MoonReading;
	season: SeasonReading;
	planets: PlanetReading[];
	meetings: Meeting[];
}

export function readSky(date: Date): SkyReading {
	return {
		moon: moonPhase(date),
		season: season(date),
		planets: planets(date),
		meetings: meetings(date),
	};
}
