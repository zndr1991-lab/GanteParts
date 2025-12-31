"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PublicInventoryItem = {
  id: string;
  skuInternal: string;
  title: string | null;
  price: number | null;
  stock: number;
  mlItemId: string | null;
  sellerCustomField: string | null;
  updatedAt: string;
  extraData: Record<string, unknown> | null;
};

const formatCurrencyMx = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "-";
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
  } catch {
    return value?.toString() ?? "-";
  }
};

const readExtraValue = (extra: Record<string, unknown> | null, keys: string[]) => {
  if (!extra) return "";
  for (const key of keys) {
    const value = extra[key];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized.length) return normalized;
    }
  }
  return "";
};

const getPieceName = (item: PublicInventoryItem) => {
  const piece = readExtraValue(item.extraData, ["pieza", "descripcion", "descripcion_local", "descripcionLocal"]);
  return piece || item.title || "Sin título";
};

const getBrand = (item: PublicInventoryItem) => {
  const raw = readExtraValue(item.extraData, ["marca", "marca_nombre", "brand", "marcaVehiculo"]);
  return raw ? raw.toUpperCase() : null;
};

const getVehicle = (item: PublicInventoryItem) => {
  const raw = readExtraValue(item.extraData, ["coche", "modelo", "vehiculo"]);
  return raw ? raw.toUpperCase() : null;
};

const getYearRange = (item: PublicInventoryItem) => {
  const start = readExtraValue(item.extraData, ["ano_desde", "anoDesde"]);
  const end = readExtraValue(item.extraData, ["ano_hasta", "anoHasta"]);
  if (!start && !end) return null;
  return `${start || "-"} - ${end || "-"}`;
};

const getOrigin = (item: PublicInventoryItem) => readExtraValue(item.extraData, ["origen", "origen_pieza", "origenPieza"]);

const toYearNumber = (value: string) => {
  const match = value.match(/\d{4}/);
  if (!match) return null;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getYearNumbers = (item: PublicInventoryItem) => {
  const startRaw = readExtraValue(item.extraData, ["ano_desde", "anoDesde"]);
  const endRaw = readExtraValue(item.extraData, ["ano_hasta", "anoHasta"]);
  const start = toYearNumber(startRaw);
  const end = toYearNumber(endRaw);
  if (!start && !end) return [];
  if (start && !end) return [start];
  if (!start && end) return [end];
  const min = Math.min(start!, end!);
  const max = Math.max(start!, end!);
  const maxSpan = Math.min(max - min, 60);
  const years: number[] = [];
  for (let year = min; year <= min + maxSpan; year += 1) {
    years.push(year);
  }
  return years;
};

const matchesYearFilter = (item: PublicInventoryItem, year: string) => {
  if (year === "ALL") return true;
  const numericYear = Number.parseInt(year, 10);
  if (Number.isNaN(numericYear)) return false;
  const years = getYearNumbers(item);
  if (!years.length) return false;
  return years.includes(numericYear);
};

const getPhotos = (item: PublicInventoryItem) => {
  const raw = item.extraData?.photos;
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length);
  }
  if (typeof raw === "string" && raw.trim().length) {
    return [raw.trim()];
  }
  return [];
};

const getInternalStatus = (item: PublicInventoryItem) => {
  const status = readExtraValue(item.extraData, ["estatus_interno", "estatusInterno"]);
  return status ? status.toUpperCase() : "ACTIVO";
};

const getQueryHaystack = (item: PublicInventoryItem) => {
  const chunks: string[] = [];
  const piece = getPieceName(item);
  if (piece) chunks.push(piece);
  if (item.skuInternal) chunks.push(item.skuInternal);
  if (item.sellerCustomField) chunks.push(item.sellerCustomField);
  const vehicle = getVehicle(item);
  if (vehicle) chunks.push(vehicle);
  const brand = getBrand(item);
  if (brand) chunks.push(brand);
  const origin = getOrigin(item);
  if (origin) chunks.push(origin);
  return chunks.join(" ").toLowerCase();
};

export function PublicInventoryClient({ items }: { items: PublicInventoryItem[] }) {
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [pieceFilter, setPieceFilter] = useState("ALL");
  const [photoModal, setPhotoModal] = useState<null | { photos: string[]; index: number; title: string }>(null);

  const openPhotoModal = useCallback((photoList: string[], startIndex: number, title: string) => {
    if (!photoList.length) return;
    const safeIndex = Math.min(Math.max(startIndex, 0), photoList.length - 1);
    setPhotoModal({ photos: photoList, index: safeIndex, title });
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModal(null);
  }, []);

  const goToNextPhoto = useCallback(() => {
    setPhotoModal((prev) => {
      if (!prev) return prev;
      const nextIndex = (prev.index + 1) % prev.photos.length;
      return { ...prev, index: nextIndex };
    });
  }, []);

  const goToPrevPhoto = useCallback(() => {
    setPhotoModal((prev) => {
      if (!prev) return prev;
      const nextIndex = (prev.index - 1 + prev.photos.length) % prev.photos.length;
      return { ...prev, index: nextIndex };
    });
  }, []);

  useEffect(() => {
    if (!photoModal) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePhotoModal();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextPhoto();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevPhoto();
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [photoModal, closePhotoModal, goToNextPhoto, goToPrevPhoto]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      const brand = getBrand(item);
      if (brand) set.add(brand);
    });
    return Array.from(set).sort();
  }, [items]);

  const itemsByBrand = useMemo(() => {
    if (brandFilter === "ALL") return items;
    return items.filter((item) => getBrand(item) === brandFilter);
  }, [items, brandFilter]);

  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    itemsByBrand.forEach((item) => {
      const vehicle = getVehicle(item);
      if (vehicle) set.add(vehicle);
    });
    return Array.from(set).sort();
  }, [itemsByBrand]);

  const itemsByVehicle = useMemo(() => {
    if (vehicleFilter === "ALL") return itemsByBrand;
    return itemsByBrand.filter((item) => getVehicle(item) === vehicleFilter);
  }, [itemsByBrand, vehicleFilter]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    itemsByVehicle.forEach((item) => {
      getYearNumbers(item).forEach((year) => set.add(year));
    });
    return Array.from(set)
      .sort((a, b) => b - a)
      .map((year) => year.toString());
  }, [itemsByVehicle]);

  const itemsByYear = useMemo(() => {
    if (yearFilter === "ALL") return itemsByVehicle;
    return itemsByVehicle.filter((item) => matchesYearFilter(item, yearFilter));
  }, [itemsByVehicle, yearFilter]);

  const pieceOptions = useMemo(() => {
    const set = new Set<string>();
    itemsByYear.forEach((item) => {
      const piece = getPieceName(item);
      if (piece) set.add(piece);
    });
    return Array.from(set).sort();
  }, [itemsByYear]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return itemsByYear.filter((item) => {
      if (pieceFilter !== "ALL" && getPieceName(item) !== pieceFilter) {
        return false;
      }
      const matchesQuery = !normalizedQuery || getQueryHaystack(item).includes(normalizedQuery);
      return matchesQuery;
    });
  }, [itemsByYear, pieceFilter, query]);

  const statusChips = useMemo(() => {
    const counter = new Map<string, number>();
    items.forEach((item) => {
      const label = getInternalStatus(item) || "SIN ESTATUS";
      counter.set(label, (counter.get(label) ?? 0) + 1);
    });
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
          <div className="text-xs uppercase tracking-[0.3em] text-emerald-400">Inventario Público</div>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">Vista en renglones igual a la app interna</h1>
          <p className="text-slate-400 md:text-lg">
            Consulta las columnas SKU, pieza, marca, coche, año, origen, precio y fotos tal como las ves internamente, sin necesidad de
            iniciar sesión.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/40 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-sm text-slate-400" htmlFor="public-search">
              Buscar por SKU, modelo o palabra clave
            </label>
            <input
              id="public-search"
              type="text"
              placeholder="Ej. faro, versa, 12345"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-400" htmlFor="brand-filter">
              Filtrar por marca
            </label>
            <select
              id="brand-filter"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              value={brandFilter}
              onChange={(event) => {
                const next = event.target.value;
                setBrandFilter(next);
                setVehicleFilter("ALL");
                setYearFilter("ALL");
                setPieceFilter("ALL");
              }}
            >
              <option value="ALL">Todas</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400" htmlFor="vehicle-filter">
              Filtrar por coche
            </label>
            <select
              id="vehicle-filter"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              value={vehicleFilter}
              onChange={(event) => {
                const next = event.target.value;
                setVehicleFilter(next);
                setYearFilter("ALL");
                setPieceFilter("ALL");
              }}
            >
              <option value="ALL">Todos</option>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle} value={vehicle}>
                  {vehicle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400" htmlFor="year-filter">
              Filtrar por año
            </label>
            <select
              id="year-filter"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              value={yearFilter}
              onChange={(event) => {
                const next = event.target.value;
                setYearFilter(next);
                setPieceFilter("ALL");
              }}
            >
              <option value="ALL">Todos</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400" htmlFor="piece-filter">
              Filtrar por pieza
            </label>
            <select
              id="piece-filter"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              value={pieceFilter}
              onChange={(event) => setPieceFilter(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {pieceOptions.map((piece) => (
                <option key={piece} value={piece}>
                  {piece}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusChips.map(([label, count]) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold tracking-widest text-slate-200"
              >
                <span className="text-lg text-amber-300">{count}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <span>
              Mostrando <strong className="text-white">{filteredItems.length}</strong> de {items.length} publicaciones activas
            </span>
            <span className="text-slate-500">Actualizado automáticamente desde el inventario interno</span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400">
              No encontramos piezas que coincidan con el filtro aplicado.
            </div>
          ) : (
            <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950/30 shadow-inner shadow-black/40">
              <table className="min-w-[1100px] w-full border-collapse text-sm">
                <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Pieza</th>
                    <th className="px-4 py-3 text-left">Marca</th>
                    <th className="px-4 py-3 text-left">Coche</th>
                    <th className="px-4 py-3 text-left">Año</th>
                    <th className="px-4 py-3 text-left">Origen</th>
                    <th className="px-4 py-3 text-right">Precio</th>
                    <th className="px-4 py-3 text-left">Fotos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const brand = getBrand(item);
                    const vehicle = getVehicle(item);
                    const yearRange = getYearRange(item);
                    const origin = getOrigin(item);
                    const mlUrl = item.mlItemId ? `https://articulo.mercadolibre.com.mx/${item.mlItemId}` : null;
                    const photos = getPhotos(item);
                    const primaryPhoto = photos[0] ?? null;
                    const extraPreview = photos.slice(1, 4);
                    const extraCount = Math.max(0, photos.length - (1 + extraPreview.length));
                    const pieceName = getPieceName(item);
                    const openModalAt = (index: number) => openPhotoModal(photos, index, pieceName);
                    const updatedLabel = (() => {
                      const parsed = new Date(item.updatedAt);
                      return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("es-MX");
                    })();
                    return (
                      <tr key={item.id} className="border-t border-slate-900/80 bg-slate-900/30 transition hover:bg-slate-900/70">
                        <td className="whitespace-nowrap px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-emerald-200">{item.skuInternal || "-"}</span>
                            {mlUrl && (
                              <a
                                href={mlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-200"
                              >
                                ML
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">Actualizado {updatedLabel}</div>
                        </td>
                        <td className="min-w-[220px] px-4 py-4 align-top">
                          <div className="font-semibold text-white">{pieceName}</div>
                          {item.sellerCustomField && (
                            <div className="text-xs text-slate-500">Ubicación: {item.sellerCustomField}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-100">{brand ?? "-"}</td>
                        <td className="px-4 py-4 text-slate-200">{vehicle ?? "-"}</td>
                        <td className="px-4 py-4 text-slate-200">{yearRange ?? "-"}</td>
                        <td className="px-4 py-4 text-slate-200">{origin || "-"}</td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-300">{formatCurrencyMx(item.price)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
                                  {primaryPhoto ? (
                                    <button
                                      type="button"
                                      onClick={() => openModalAt(0)}
                                      className="group relative block h-full w-full"
                                    >
                                      <img src={primaryPhoto} alt={item.title ?? "Foto principal"} className="h-full w-full object-cover" loading="lazy" />
                                      <span className="pointer-events-none absolute inset-0 bg-black/30 opacity-0 transition group-hover:opacity-100" />
                                    </button>
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">Sin foto</div>
                                  )}
                            </div>
                            {extraPreview.length > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {extraPreview.map((photo, index) => (
                                    <button
                                      type="button"
                                      key={`${item.id}-thumb-${index}`}
                                          onClick={() => openModalAt(index + 1)}
                                      className="h-10 w-10 overflow-hidden rounded-full border border-slate-800"
                                    >
                                      <img
                                        src={photo}
                                        alt="Foto adicional"
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    </button>
                                  ))}
                                </div>
                                {extraCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => openModalAt(photos.length - extraCount)}
                                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-[11px] font-semibold text-slate-300"
                                      >
                                        +{extraCount}
                                      </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      </div>

      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-8" role="dialog" aria-modal="true">
          <div className="absolute inset-0" onClick={closePhotoModal} />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/70">
            <button
              type="button"
              onClick={closePhotoModal}
              className="absolute right-4 top-4 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase text-slate-200"
            >
              Cerrar
            </button>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={goToPrevPhoto}
                className="hidden rounded-full border border-slate-700 bg-slate-800/80 p-3 text-white transition hover:border-emerald-400 hover:text-emerald-300 sm:block"
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <div className="flex-1">
                <img
                  src={photoModal.photos[photoModal.index]}
                  alt={photoModal.title}
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                  loading="lazy"
                />
                <div className="mt-4 text-center text-sm font-semibold text-white">{photoModal.title}</div>
                <div className="text-center text-xs uppercase tracking-widest text-slate-400">
                  Foto {photoModal.index + 1} de {photoModal.photos.length}
                </div>
              </div>
              <button
                type="button"
                onClick={goToNextPhoto}
                className="hidden rounded-full border border-slate-700 bg-slate-800/80 p-3 text-white transition hover:border-emerald-400 hover:text-emerald-300 sm:block"
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {photoModal.photos.map((photo, idx) => (
                <button
                  key={`${photo}-${idx}`}
                  type="button"
                  onClick={() => openPhotoModal(photoModal.photos, idx, photoModal.title)}
                  className={`h-12 w-12 overflow-hidden rounded-lg border ${
                    idx === photoModal.index ? "border-emerald-400" : "border-slate-700"
                  }`}
                >
                  <img src={photo} alt="Miniatura" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Usa ← → o da clic en las miniaturas</span>
              <span>Esc para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
