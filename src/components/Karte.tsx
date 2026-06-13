import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { Badge } from "@/components/ui/badge";
import { CalendarHeart, HeartHandshake, HandHeart } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Ainsart from "../components/Ainsart";
import {
  Map as MapComponent,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from "@/components/ui/map";
import {
  MS_PER_DAY,
  TimeBadge,
  createEvents,
  generateBadges,
  getTopBottom,
  type Layout,
  Markt,
  MarktBadge,
  type MarktData,
  type ArtisanData,
  type CafeData,
} from "../lib/timeline";
import { MarkerPopupCard } from "@/components/ui/marker-popup-card";

const LNG_LAT_GOE = [9.936, 51.541];

interface KarteProps {
  events: MarktData[];
  artisans?: ArtisanData[];
  cafes?: CafeData[];
}

function MapEventHandler({
  onBoundsChange,
  lngLats,
}: {
  onBoundsChange: (bounds: maplibregl.LngLatBounds) => void;
  lngLats: [number, number][];
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || lngLats.length === 0) return;
    const bounds = new maplibregl.LngLatBounds(
      lngLats[0] as maplibregl.LngLatLike,
      lngLats[0] as maplibregl.LngLatLike,
    );
    lngLats.slice(1).forEach((lngLat) => {
      bounds.extend(lngLat as maplibregl.LngLatLike);
    });
    map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
  }, [map, isLoaded, lngLats]);

  useEffect(() => {
    if (!map) return;
    const updateBounds = () => onBoundsChange(map.getBounds());
    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);
    updateBounds();
    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (!map) return;
    const handleContextMenu = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      const { lng, lat } = e.lngLat;
      navigator.clipboard.writeText(`${lng.toFixed(5)}, ${lat.toFixed(5)}`);
    };
    map.on("contextmenu", handleContextMenu);
    return () => {
      map.off("contextmenu", handleContextMenu);
    };
  }, [map]);

  return null;
}

export default function Karte({
  events,
  artisans = [],
  cafes = [],
}: KarteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const timeline = useRef({
    x: typeof window !== "undefined" ? window.innerWidth * 0.25 : 300,
    zdt: Temporal.Now.zonedDateTimeISO(),
    ppd: 12,
  });

  const [, forceUpdate] = useState(0);
  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    const handleResize = () => rerender();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rerender]);

  useEffect(() => {
    requestAnimationFrame(() => rerender());
  }, [rerender]);

  const getVisibleWidth = useCallback(() => {
    if (!containerRef.current) return 0;
    return containerRef.current.clientWidth;
  }, []);

  const computeLayout = useCallback((): Layout => {
    const width = getVisibleWidth();
    const { zdt, ppd } = timeline.current;
    const msPerPx = MS_PER_DAY / ppd;
    const start = zdt.subtract({
      milliseconds: Math.floor(timeline.current.x * msPerPx),
    });
    const end = zdt.add({
      milliseconds: Math.floor((width - timeline.current.x) * msPerPx),
    });
    const { top: TopBadge, bottom: BottomBadge } = getTopBottom(ppd);
    const top: TimeBadge[] = generateBadges(TopBadge, start, end);
    const bottom: TimeBadge[] = generateBadges(BottomBadge, start, end);
    const now = Temporal.Now.zonedDateTimeISO();
    return {
      top,
      bottom,
      startMilliseconds: start.epochMilliseconds,
      endMilliseconds: end.epochMilliseconds,
      nowMilliseconds: now.epochMilliseconds,
      ppd,
    };
  }, [getVisibleWidth]);

  const WHEEL_SENSITIVITY = 0.002;
  const TOUCH_SENSITIVITY = 0.008;
  const MIN_PPD = 1.2;
  const MAX_PPD = 2400;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let isPinching = false;
    let initialPinchDistance = 0;
    let initialPpd = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    const getDistance = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
    ) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const getMidpointX = (p1: { x: number }, p2: { x: number }) => {
      return (p1.x + p2.x) / 2;
    };
    const setOrigin = (x: number) => {
      const msPerPx = MS_PER_DAY / timeline.current.ppd;
      timeline.current.zdt = timeline.current.zdt.add({
        milliseconds: Math.round((x - timeline.current.x) * msPerPx),
      });
      timeline.current.x = x;
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pointers.size === 1) {
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        setOrigin(e.clientX);
      } else if (pointers.size === 2) {
        isPinching = true;
        const pts = Array.from(pointers.values());
        initialPinchDistance = getDistance(pts[0], pts[1]);
        initialPpd = timeline.current.ppd;
        setOrigin(getMidpointX(pts[0], pts[1]));
      }
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (isPinching && pointers.size >= 2) {
        e.preventDefault();
        const pts = Array.from(pointers.values());
        const newDistance = getDistance(pts[0], pts[1]);
        const ratio = newDistance / initialPinchDistance;
        timeline.current.ppd = Math.max(
          MIN_PPD,
          Math.min(MAX_PPD, initialPpd * ratio),
        );
        rerender();
      } else if (!isPinching && pointers.size === 1) {
        e.preventDefault();
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        if (Math.abs(dx) > Math.abs(dy))
          timeline.current.x = timeline.current.x + dx;
        else
          timeline.current.ppd = Math.max(
            MIN_PPD,
            Math.min(
              MAX_PPD,
              timeline.current.ppd * Math.exp(dy * TOUCH_SENSITIVITY),
            ),
          );
        rerender();
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (isPinching && pointers.size < 2) {
        isPinching = false;
        if (pointers.size === 1) {
          const remaining = Array.from(pointers.values())[0];
          lastDragX = remaining.x;
          setOrigin(remaining.x);
        }
      }
    };
    el.addEventListener("pointerdown", handlePointerDown, { passive: false });
    el.addEventListener("pointermove", handlePointerMove, { passive: false });
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointercancel", handlePointerUp);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [rerender]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const msPerPx = MS_PER_DAY / timeline.current.ppd;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        timeline.current.zdt = timeline.current.zdt.add({
          milliseconds: Math.round((e.clientX - timeline.current.x) * msPerPx),
        });
        timeline.current.x = e.clientX;
        timeline.current.ppd = Math.max(
          MIN_PPD,
          Math.min(
            MAX_PPD,
            timeline.current.ppd * Math.exp(-e.deltaY * WHEEL_SENSITIVITY),
          ),
        );
      } else {
        timeline.current.zdt = timeline.current.zdt.add({
          milliseconds: Math.round(e.deltaX * msPerPx),
        });
      }
      rerender();
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [rerender]);

  const lastClickTime = useRef(0);
  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      const msPerPx = MS_PER_DAY / timeline.current.ppd;
      timeline.current.zdt = timeline.current.zdt.add({
        milliseconds: Math.round(
          (event.clientX - timeline.current.x) * msPerPx,
        ),
      });
      timeline.current.x = event.clientX;
      timeline.current.ppd = Math.max(
        MIN_PPD,
        Math.min(
          MAX_PPD,
          timeline.current.ppd * Math.exp(500 * WHEEL_SENSITIVITY),
        ),
      );
      rerender();
    }
    lastClickTime.current = now;
  };

  const layout = computeLayout();
  const [bounds, setBounds] = useState<maplibregl.LngLatBounds | null>(null);

  const EVENTS = useMemo(() => createEvents(events), [events]);
  const lngLats = useMemo(() => EVENTS.map((e) => e.lnglat), [EVENTS]);

  const visibleMarkets = useMemo(
    () =>
      EVENTS.filter((event) =>
        event.isVisible(
          bounds,
          layout.startMilliseconds,
          layout.endMilliseconds,
        ),
      ),
    [EVENTS, bounds, layout.startMilliseconds, layout.endMilliseconds],
  );

  const visibleArtisans = useMemo(
    () =>
      bounds
        ? artisans.filter((a) =>
            bounds.contains(a.lnglat as maplibregl.LngLatLike),
          )
        : artisans,
    [artisans, bounds],
  );

  const visibleCafes = useMemo(
    () =>
      bounds
        ? cafes.filter((c) =>
            bounds.contains(c.lnglat as maplibregl.LngLatLike),
          )
        : cafes,
    [cafes, bounds],
  );

  const h = 30;
  return (
    <main className="h-[calc(100dvh) - 28px] relative">
      <div
        className="w-full select-none"
        style={{ height: `calc(100dvh - ${3 * h}px - 28px)` }}
      >
        <MapComponent
          styles={{
            light: "https://tiles.openfreemap.org/styles/bright",
            dark: "https://tiles.openfreemap.org/styles/bright",
          }}
          center={LNG_LAT_GOE as [number, number]}
          zoom={10}
        >
          <MapEventHandler
            onBoundsChange={setBounds}
            lngLats={lngLats as [number, number][]}
          />

          {visibleMarkets.map((market) => (
            <MapMarker
              key={market.handle}
              longitude={market.lnglat[0]}
              latitude={market.lnglat[1]}
            >
              <MarkerContent
                className={`p-1 bg-gray-100 rounded-full aspect-square ${market.badge.isPast(layout.nowMilliseconds) ? "border-gray-300" : "border-yellow-500"} border-solid border-1`}
              >
                <CalendarHeart
                  className={
                    market.badge.isPast(layout.nowMilliseconds)
                      ? "stroke-gray-400"
                      : "stroke-yellow-500"
                  }
                />
              </MarkerContent>
              <MarkerPopupCard
                href={`/m/${market.handle}`}
                name={market.title}
                description={market.description}
              />
            </MapMarker>
          ))}

          {visibleArtisans.map((artisan) => (
            <MapMarker
              key={artisan.handle}
              longitude={artisan.lnglat[0]}
              latitude={artisan.lnglat[1]}
            >
              <MarkerContent className="p-1 bg-gray-100 rounded-full aspect-square border-green-600 border-solid border-1">
                <HandHeart className="stroke-green-600" />
              </MarkerContent>
              <MarkerPopupCard
                href={`/a/${artisan.handle}`}
                name={artisan.name}
                description={artisan.description}
              />
            </MapMarker>
          ))}

          {visibleCafes.map((cafe) => (
            <MapMarker
              key={cafe.handle}
              longitude={cafe.lnglat[0]}
              latitude={cafe.lnglat[1]}
            >
              <MarkerContent className="p-1 bg-gray-100 rounded-full aspect-square border-green-600 border-solid border-1">
                <HeartHandshake className="stroke-green-600" />
              </MarkerContent>
              <MarkerPopupCard
                href={`/c/${cafe.handle}`}
                name={cafe.name}
                description={cafe.description}
              />
            </MapMarker>
          ))}
        </MapComponent>
      </div>
      <Ainsart center={false} />
      <div
        ref={containerRef}
        className={`w-full h-[${3 * h}px] overflow-hidden select-none cursor-grab`}
        style={{
          touchAction: "none",
          willChange: "transform",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
        onClick={handleTimelineClick}
      >
        <svg
          width={getVisibleWidth()}
          height={3 * h}
          className="block"
          style={{ backgroundColor: "transparent" }}
        >
          <line
            x1={0}
            y1={2 * h}
            x2={getVisibleWidth()}
            y2={2 * h}
            className="stroke-gray-300"
            strokeWidth={1}
          />
          {visibleMarkets.map((m: Markt) => {
            if (layout.ppd < 240) {
              return (
                <foreignObject
                  key={m.badge.id}
                  x={m.badge.x(layout.startMilliseconds, layout.ppd)}
                  y={0}
                  width={m.badge.width(layout.ppd)}
                  height={h}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Badge
                      variant="event"
                      className={`flex w-full h-[22px] ${!m.badge.isPast(layout.nowMilliseconds) && "border-yellow-500 text-yellow-500"}`}
                    >
                      {m.badge.label(layout.ppd)}
                    </Badge>
                  </div>
                </foreignObject>
              );
            } else {
              return m.badges.map((b: MarktBadge) => {
                return (
                  <foreignObject
                    key={b.id}
                    x={b.x(layout.startMilliseconds, layout.ppd)}
                    y={0}
                    width={b.width(layout.ppd)}
                    height={h}
                  >
                    <div
                      className={`w-full h-full flex items-center justify-center`}
                    >
                      <Badge
                        variant="event"
                        className={`flex w-full h-[22px] ${!m.badge.isPast(layout.nowMilliseconds) && "border-yellow-500 text-yellow-500"}`}
                      >
                        {b.label(layout.ppd)}
                      </Badge>
                    </div>
                  </foreignObject>
                );
              });
            }
          })}

          {layout.bottom.map((badge) => (
            <>
              <foreignObject
                key={badge.id}
                x={badge.x(layout.startMilliseconds, layout.ppd)}
                y={h}
                width={badge.width(layout.ppd)}
                height={h}
              >
                <div
                  className={`w-full h-full flex items-center justify-center text-sm ${badge.isPast(layout.nowMilliseconds) ? "text-timeline-past-fg" : "text-timeline-future-fg"}`}
                >
                  {badge.label(layout.ppd)}
                </div>
              </foreignObject>
              <line
                key={"line-" + badge.id}
                x1={badge.x(layout.startMilliseconds, layout.ppd)}
                y1={1.38 * h}
                x2={badge.x(layout.startMilliseconds, layout.ppd)}
                y2={2 * h}
                className="stroke-gray-300"
                strokeWidth={1}
              />
            </>
          ))}

          {layout.top.map((badge) => (
            <>
              <foreignObject
                key={badge.id}
                x={badge.x(layout.startMilliseconds, layout.ppd)}
                y={2 * h}
                width={badge.width(layout.ppd)}
                height={h}
              >
                <div
                  className={`w-full h-full flex items-center justify-center text-sm ${badge.isPast(layout.nowMilliseconds) ? "text-timeline-past-fg" : "text-timeline-future-fg"}`}
                >
                  {badge.label(layout.ppd)}
                </div>
              </foreignObject>
              <line
                key={"line-" + badge.id}
                x1={badge.x(layout.startMilliseconds, layout.ppd)}
                y1={2 * h}
                x2={badge.x(layout.startMilliseconds, layout.ppd)}
                y2={2.62 * h}
                className="stroke-gray-300"
                strokeWidth={1}
              />
            </>
          ))}
        </svg>
      </div>
    </main>
  );
}
