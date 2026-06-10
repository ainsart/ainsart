import { Temporal } from "@js-temporal/polyfill";
import type maplibregl from "maplibre-gl";

export const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const TIME_ZERO = {
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
  microsecond: 0,
  nanosecond: 0,
};
export const MINUTE_ZERO = {
  minute: 0,
  second: 0,
  millisecond: 0,
  microsecond: 0,
  nanosecond: 0,
};

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export abstract class TimeBadge {
  constructor(protected zdt: Temporal.ZonedDateTime) {}

  protected _start?: Temporal.ZonedDateTime;
  protected _end?: Temporal.ZonedDateTime;
  protected _duration?: Temporal.Duration;
  protected _days?: number;
  protected _startMilliseconds?: number;
  protected _endMilliseconds?: number;

  abstract get id(): string;
  abstract get start(): Temporal.ZonedDateTime;
  abstract get end(): Temporal.ZonedDateTime;
  abstract get next(): TimeBadge;
  abstract label(ppd: number): string;

  isPast(nowMilliseconds: number) {
    if (!this._endMilliseconds)
      this._endMilliseconds = this.end.epochMilliseconds;
    return this._endMilliseconds < nowMilliseconds;
  }

  isFuture(nowMilliseconds: number) {
    if (!this._startMilliseconds)
      this._startMilliseconds = this.start.epochMilliseconds;
    return this._startMilliseconds > nowMilliseconds;
  }

  get duration(): Temporal.Duration {
    if (!this._duration) this._duration = this.start.until(this.end);
    return this._duration;
  }

  x(startMilliseconds: number, ppd: number) {
    if (!this._startMilliseconds)
      this._startMilliseconds = this.start.epochMilliseconds;
    const ms = this._startMilliseconds - startMilliseconds;
    const pxPerMs = ppd / MS_PER_DAY;
    return pxPerMs * ms;
  }

  width(ppd: number): number {
    if (!this._startMilliseconds)
      this._startMilliseconds = this.start.epochMilliseconds;
    if (!this._endMilliseconds)
      this._endMilliseconds = this.end.epochMilliseconds;
    const pxPerMs = ppd / MS_PER_DAY;
    const ms = this._endMilliseconds - this._startMilliseconds;
    return pxPerMs * ms;
  }
}

export class YearBadge extends TimeBadge {
  get id() {
    return `year-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start)
      this._start = this.zdt.with({ month: 1, day: 1 }).with(TIME_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ years: 1 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new YearBadge(this.zdt.add({ years: 1 }));
  }
  label(ppd: number) {
    return String(this.zdt.year);
  }
}

export class SeasonBadge extends TimeBadge {
  get id() {
    return `season-${this.start.epochMilliseconds}`;
  }
  get start() {
    // 02-02 | Imbolc
    // 03-21 | Ostara
    // 05-01 | Beltane
    // 06-21 | Litha
    // 08-02 | Lughnasadh
    // 09-23 | Mabon
    // 10-31 | Samhain
    // 12-21 | Yule
    if (this._start) return this._start;

    this._start = this.zdt.with({ month: 1, day: 1 }).with(TIME_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ years: 1 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new SeasonBadge(this.zdt.add({ years: 1 }));
  }
  label(_ppd: number) {
    return String(this.zdt.year);
  }
}

export class MonthBadge extends TimeBadge {
  get id() {
    return `month-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start) this._start = this.zdt.with(TIME_ZERO).with({ day: 1 });
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ months: 1 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new MonthBadge(this.zdt.add({ months: 1 }));
  }
  label(ppd: number) {
    if (ppd <= 2.8) return this.zdt.toLocaleString("de-DE", { month: "short" });
    if (ppd <= 4.1) return this.zdt.toLocaleString("de-DE", { month: "long" });
    return this.zdt.toLocaleString("de-DE", { month: "long", year: "numeric" });
  }
}

export class WeekBadge extends TimeBadge {
  get id() {
    return `week-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start)
      this._start = this.zdt
        .subtract({ days: this.zdt.dayOfWeek - 1 })
        .with(TIME_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ days: 7 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new WeekBadge(this.zdt.add({ days: 7 }));
  }
  label(ppd: number) {
    if (ppd < 8) return `W${this.zdt.weekOfYear}`;
    if (ppd < 13) return `KW${this.zdt.weekOfYear}`;
    return `KW${this.zdt.weekOfYear} ${this.zdt.year}`;
  }
}

export class DayBadge extends TimeBadge {
  get id() {
    return `day-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start) this._start = this.zdt.with(TIME_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ days: 1 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new DayBadge(this.zdt.add({ days: 1 }));
  }
  label(ppd: number) {
    if (ppd < 64)
      return this.zdt.toLocaleString("de-DE", {
        day: "numeric",
        month: "numeric",
      });
    if (ppd < 100)
      return this.zdt.toLocaleString("de-DE", {
        day: "numeric",
        month: "short",
      });
    if (ppd < 120)
      return this.zdt.toLocaleString("de-DE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    return this.zdt.toLocaleString("de-DE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
}

export class DaytimeBadge extends TimeBadge {
  get id() {
    return `daytime-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start)
      this._start = this.zdt
        .with({ hour: Math.floor(this.zdt.hour / 6) * 6 })
        .with(MINUTE_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ hours: 6 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new DaytimeBadge(this.zdt.add({ hours: 6 }));
  }
  label(ppd: number) {
    if (ppd < 500) return `${this.start.hour} - ${this.end.hour} Uhr`;
    if (ppd < 800) return `${this.start.hour}:00 - ${this.end.hour}:00 Uhr`;
    return `${this.zdt.toLocaleString("de-DE", { day: "numeric", month: "short" })}, ${this.start.hour}:00 - ${this.end.hour}:00 Uhr`;
  }
}

export class HourBadge extends TimeBadge {
  get id() {
    return `hour-${this.start.epochMilliseconds}`;
  }
  get start() {
    if (!this._start) this._start = this.zdt.with(MINUTE_ZERO);
    return this._start;
  }
  get end() {
    if (!this._end)
      this._end = this.start.add({ hours: 1 }).subtract({ nanoseconds: 1 });
    return this._end;
  }
  get next() {
    return new HourBadge(this.zdt.add({ hours: 1 }));
  }
  get labelTop() {
    return `${this.start.hour}:00`;
  }
  label(ppd: number) {
    if (ppd < 1200) return `${this.start.hour}`;
    if (ppd < 1900) return `${this.start.hour}:00`;
    return `${this.start.hour}:00 Uhr`;
  }
}

export class MarktBadge extends TimeBadge {
  constructor(
    readonly start: Temporal.ZonedDateTime,
    readonly end: Temporal.ZonedDateTime,
    readonly title: string,
  ) {
    super(start);
  }
  get id() {
    return `event-${this.title}-${this.start.epochMilliseconds}`;
  }
  get next() {
    return this;
  }
  label(ppd: number) {
    const estimatedChars = Math.floor(this.width(ppd) / 8);
    return this.title.length <= estimatedChars
      ? this.title
      : this.title.slice(0, estimatedChars - 2) + "…";
  }
  width(ppd: number): number {
    const actualWidth = super.width(ppd);
    return Math.max(actualWidth, 22);
  }
}

export type BadgeConstructor = new (
  datetime: Temporal.ZonedDateTime,
) => TimeBadge;

export interface ZoomLevel {
  top: BadgeConstructor;
  bottom: BadgeConstructor;
}

export function getTopBottom(ppd: number): ZoomLevel {
  if (ppd < 6) return { top: YearBadge, bottom: MonthBadge };
  if (ppd < 48) return { top: MonthBadge, bottom: WeekBadge };
  if (ppd < 350) return { top: WeekBadge, bottom: DayBadge };
  if (ppd < 800) return { top: DayBadge, bottom: DaytimeBadge };
  return { top: DaytimeBadge, bottom: HourBadge };
}

export interface MarktData {
  title: string;
  place: string;
  url: string;
  badges: { start: string; end: string; title?: string }[];
  lnglat: [number, number];
  organizer: string;
  year: number;
  handle: string;
}

export interface ArtisanData {
  handle: string;
  name: string;
  location: string;
  address: string;
  lnglat: [number, number];
}

export interface CafeData {
  handle: string;
  name: string;
  location: string;
  address: string;
  lnglat: [number, number];
}

export class Markt {
  constructor(
    readonly title: string,
    readonly place: string,
    readonly url: string,
    readonly badges: MarktBadge[],
    readonly badge: MarktBadge,
    readonly lnglat: [number, number],
    readonly organizer: string,
    readonly handle: string,
  ) {}
  get id(): string {
    return slug(this.title);
  }
  isVisible(
    mapBounds: maplibregl.LngLatBounds | null,
    startMs: number,
    endMs: number,
  ): boolean {
    const hasTimeOverlap = this.badges.some(
      (badge) =>
        badge.end.epochMilliseconds > startMs &&
        badge.start.epochMilliseconds < endMs,
    );
    if (!hasTimeOverlap) return false;
    if (mapBounds) {
      return mapBounds.contains(this.lnglat as maplibregl.LngLatLike);
    }
    return true;
  }
}

export function createEvents(data: MarktData[]): Markt[] {
  return data.map(
    (d) =>
      new Markt(
        d.title,
        d.place,
        d.url,
        d.badges.map(
          (b) =>
            new MarktBadge(
              Temporal.ZonedDateTime.from(b.start),
              Temporal.ZonedDateTime.from(b.end),
              d.title,
            ),
        ),
        new MarktBadge(
          Temporal.ZonedDateTime.from(d.badges.at(0)!.start),
          Temporal.ZonedDateTime.from(d.badges.at(-1)!.end),
          d.title,
        ),
        d.lnglat,
        d.organizer,
        d.handle,
      ),
  );
}

export interface Layout {
  top: TimeBadge[];
  bottom: TimeBadge[];
  startMilliseconds: number;
  endMilliseconds: number;
  ppd: number;
  nowMilliseconds: number;
}

export function generateBadges(
  badgeConstrutor: BadgeConstructor,
  start: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime,
): TimeBadge[] {
  const badges: TimeBadge[] = [];
  let badge = new badgeConstrutor(start);
  badges.push(badge);
  while (badge.start.epochMilliseconds < end.epochMilliseconds) {
    badge = badge.next;
    badges.push(badge);
  }
  return badges;
}
