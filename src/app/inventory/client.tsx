"use client";

import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  skuInternal: string;
  title: string | null;
  price: number | null;
  stock: number;
  mlItemId: string | null;
  status: string;
  sellerCustomField: string | null;
  extraData?: Record<string, any> | null;
};

type FocusedInfo = {
  sku: string;
  coche: string;
  ano: string;
};

type GridApiLite = {
  stopEditing?: () => void;
  getFocusedCell?: () => unknown;
  getSelectedRows?: () => Item[];
  getDisplayedRowAtIndex?: (index: number) => { data?: Item } | null;
};

type CellKeyDownHandlerEvent = {
  api: GridApiLite;
  event?: {
    key?: string;
    preventDefault: () => void;
  } | null;
};

type SelectionChangedEventLite = {
  api: GridApiLite;
};

type RowSelectedEventLite = {
  node: {
    isSelected: () => boolean;
    data?: Item | null;
  };
  api: GridApiLite;
};

type CellFocusedEventLite = {
  rowIndex?: number | null;
  api?: GridApiLite;
};

const brandOptions = [
  "ACURA",
  "AUDI",
  "BMW",
  "BUICK",
  "CADILLAC",
  "CHEVROLET",
  "CHRYSLER",
  "CITROEN",
  "DODGE",
  "FIAT",
  "FORD",
  "GMC",
  "HONDA",
  "HYUNDAI",
  "INFINITI",
  "JEEP",
  "KIA",
  "MAZDA",
  "MERCEDES BENZ",
  "MINI",
  "MITSUBISHI",
  "NISSAN",
  "PEUGEOT",
  "RAM",
  "RENAULT",
  "SEAT",
  "SUBARU",
  "SUZUKI",
  "TOYOTA",
  "VOLKSWAGEN",
  "VOLVO"
];

const deletePasswordSecret = (process.env.NEXT_PUBLIC_DELETE_PASSWORD ?? "").trim();

const MAX_PHOTOS = 8;

const estatusInternoOptions = [
  "ML",
  "PRESTADO",
  "VENDIDO",
  "FOTOS",
  "FALTA UBICACION",
  "NO ESTA",
  "CHECAR",
  "SIN SUBIR"
];
const sortedEstatusInternoOptions = [...estatusInternoOptions].sort();

const origenOptions = [
  "NUEVO ORIGINAL",
  "NUEVO ORIGINAL CON DETALLE",
  "TW/GENERICO",
  "TW/GENERICO CON DETALLE",
  "USADO ORIGINAL SANO",
  "USADO ORIGINAL CON DETALLE"
];
const sortedOrigenOptions = [...origenOptions].sort();

const nuevoOriginalDescripcion =
  "PIEZA NUEVA ORIGINAL PUEDE QUE TENGA RASPONES DE ALMACENAMIENTO QUE NO AFECTAN EN NADA A SU FUNCIONAMIENTO.\n" +
  "SI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE .\n\n" +
  "SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const nuevoOriginalDetalleDescripcion =
  "PIEZA ORIGINAL CON DAÑOS APRECIABLES EN FOTOS SI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE (NUEVO SE REFIERE A QUE NUNCA FUE INSTALADA) .  SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const twGenericoDescripcion =
  "PIEZA NUEVA TW/GENERICA/NO ORIGINAL\nSI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE.  -SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const twGenericoDetalleDescripcion =
  "PIEZA   TW/GENERICA/NO ORIGINAL CON DAÑOS APRECIABLES EN FOTOS\nSI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE . -SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const usadoOriginalSanoDescripcion =
  "PIEZA USADA ORIGINAL EN BUENAS CONDICIONES\nSI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE.  - SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const usadoOriginalDetalleDescripcion =
  "PIEZA CON DAÑOS APRECIABLES EN FOTOS SI NECESITA MAS FOTOS ENVIÉ MENSAJE ESTAREMOS AL PENDIENTE PARA RESPONDER LO MAS PRONTO POSIBLE.  -SI FACTURAMOS, PRECIO YA INCLUYE IVA";

const brandModels: Record<string, string[]> = {
  VOLKSWAGEN: ["BORA", "VENTO", "GOL", "JETTA", "POLO", "TIGUAN", "PASSAT", "SAVEIRO"],
  KIA: ["K3", "K4", "RIO", "SELTOS", "SPORTAGE", "SOUL", "SORENTO", "FORTE", "CERATO"],
  HYUNDAI: ["GRAND I10", "ELANTRA", "ACCENT", "CRETA", "TUCSON", "SANTA FE"],
  NISSAN: ["VERSA", "SENTRA", "MARCH", "FRONTIER", "XTRAIL"],
  TOYOTA: ["HILUX", "COROLLA", "CAMRY", "RAV4", "YARIS"],
  HONDA: ["CIVIC", "ACCORD", "CITY", "CRV", "HRV"],
  CHEVROLET: ["ONIX", "AVEO", "TRACKER", "CRUZE", "SILVERADO"],
  FORD: ["FIESTA", "FOCUS", "RANGER", "ESCAPE", "EXPLORER"],
  MAZDA: ["MAZDA 2", "MAZDA 3", "CX3", "CX5", "CX30"],
  BMW: ["SERIE 1", "SERIE 3", "SERIE 5", "X1", "X3"],
  "MERCEDES BENZ": ["A200", "C200", "GLA", "GLC", "GLE"],
  AUDI: ["A1", "A3", "A4", "Q2", "Q3"],
  RENAULT: ["KWID", "STEPWAY", "DUSTER", "LOGAN"],
  PEUGEOT: ["208", "2008", "301", "3008"],
  SUZUKI: ["SWIFT", "IGNIS", "VITARA", "BALENO"],
  SUBARU: ["IMPREZA", "FORESTER", "XV", "OUTBACK"],
  JEEP: ["RENEGADE", "COMPASS", "WRANGLER", "GLADIATOR"],
  RAM: ["1500", "700", "2500"],
  ACURA: ["ILX", "TLX", "RDX", "MDX"],
  INFINITI: ["Q30", "Q50", "QX50", "QX60"],
  VOLVO: ["XC40", "XC60", "XC90", "S60", "V60"],
  DODGE: ["ATTITUDE", "JOURNEY", "CHARGER"],
  FIAT: ["PULSE", "ARGO", "CRONOS"],
  CITROEN: ["C3", "C4 CACTUS", "C5 AIRCROSS"],
  SEAT: ["IBIZA", "LEON", "ARONA", "ATECA"],
  MITSUBISHI: ["L200", "OUTLANDER", "MIRAGE"],
  GMC: ["TERRAIN", "ACADIA", "SIERRA"],
  BUICK: ["ENCORE", "ENVISION", "ENCLAVE"],
  CADILLAC: ["XT4", "XT5", "ESCALADE"],
  CHRYSLER: ["PACIFICA", "300"],
  MINI: ["COOPER", "COUNTRYMAN", "CLUBMAN"]
};

const toUpper = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

const sanitizePhotos = (value: any) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length)
    .slice(0, MAX_PHOTOS);
};

const toFocusedInfo = (item?: Item | null): FocusedInfo | null => {
  if (!item) return null;
  const extra = item.extraData ?? {};
  const hasYear = extra.ano_desde || extra.ano_hasta;
  const ano = hasYear ? `${extra.ano_desde ?? "-"}-${extra.ano_hasta ?? "-"}` : "-";
  const sku = (item.skuInternal ?? "").toString().trim();
  const cocheRaw = (extra.coche ?? "").toString().trim();
  return {
    sku: sku.length ? sku.toUpperCase() : "-",
    coche: cocheRaw.length ? cocheRaw.toUpperCase() : "-",
    ano
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const match = value.replace(/\./g, "/").match(/(\d{1,4})[\/](\d{1,2})[\/](\d{1,4})/);
  if (match) {
    const first = match[1];
    const second = match[2];
    const third = match[3];
    const yearFirst = first.length === 4;
    const day = yearFirst ? third : first;
    const month = second;
    const year = yearFirst ? first : third;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year.padStart(4, "0")}`;
  }
  return value;
};

const formatCurrencyMx = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2
    }).format(Number(value));
  } catch {
    return value?.toString() ?? "-";
  }
};

export function InventoryClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [focusedRowInfo, setFocusedRowInfo] = useState<FocusedInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [form, setForm] = useState({
    skuInternal: "",
    estatusInterno: "",
    stock: "",
    pieza: "",
    marca: "",
    coche: "",
    anoDesde: "",
    anoHasta: "",
    origen: "",
    price: "",
    precioCompra: "",
    ubicacion: ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const modalPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoModal, setPhotoModal] = useState<{ id: string; title: string } | null>(null);
  const [modalPhotos, setModalPhotos] = useState<string[]>([]);
  const [photoModalSaving, setPhotoModalSaving] = useState(false);
  const [photoModalError, setPhotoModalError] = useState<string | null>(null);
  const [modalActiveIndex, setModalActiveIndex] = useState(0);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/inventory/template");
      if (!res.ok) throw new Error("No se pudo descargar la plantilla");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla-inventario.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setMessage(err.message || "No se pudo descargar");
    } finally {
      setDownloading(false);
    }
  };

  const refresh = useCallback(async () => {
    const res = await fetch("/api/inventory");
    if (res.ok) {
      const data = await res.json();
      setItems(data);
      setSelectedIds([]);
      setFocusedRowInfo(null);
    }
  }, []);

  const deleteItems = useCallback(async (ids: string[], password?: string) => {
    if (!ids.length) return;
    setMessage(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { ids, password } : { ids })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo borrar");
      }
      setMessage(`Eliminados: ${data.deleted ?? ids.length}`);
      await refresh();
    } catch (err: any) {
      setMessage(err.message || "No se pudo borrar");
    }
  }, [refresh]);

  const requestDeleteAuthorization = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    const confirmed = window.confirm(
      `Estas por borrar ${ids.length} ${ids.length === 1 ? "registro" : "registros"}. Esta accion no se puede deshacer. ¿Continuar?`
    );
    if (!confirmed) return;
    const passwordInput = window.prompt("Ingresa la contraseña para confirmar el borrado");
    if (passwordInput === null) {
      setMessage("Borrado cancelado");
      return;
    }
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setMessage("La contraseña no puede estar vacia");
      return;
    }
    if (deletePasswordSecret && trimmed !== deletePasswordSecret) {
      setMessage("Contraseña incorrecta");
      return;
    }
    await deleteItems(ids, trimmed);
  }, [deleteItems]);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
      reader.readAsDataURL(file);
    });

  const openPhotoModal = useCallback((itemId: string, title: string, photos: string[]) => {
    setPhotoModal({ id: itemId, title });
    setModalPhotos(photos.slice(0, MAX_PHOTOS));
    setPhotoModalError(null);
    setModalActiveIndex(0);
    if (modalPhotoInputRef.current) {
      modalPhotoInputRef.current.value = "";
    }
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModal(null);
    setModalPhotos([]);
    setPhotoModalError(null);
    setModalActiveIndex(0);
    if (modalPhotoInputRef.current) {
      modalPhotoInputRef.current.value = "";
    }
  }, []);

  const handleModalFileSelection = async (fileList: FileList | null) => {
    if (!photoModal || !fileList?.length) return;
    setPhotoModalError(null);
    const remainingSlots = MAX_PHOTOS - modalPhotos.length;
    if (remainingSlots <= 0) {
      setPhotoModalError(`Maximo ${MAX_PHOTOS} fotos por producto`);
      if (modalPhotoInputRef.current) modalPhotoInputRef.current.value = "";
      return;
    }
    try {
      const files = Array.from(fileList).slice(0, remainingSlots);
      const dataUrls = await Promise.all(files.map((file) => fileToDataUrl(file)));
      setModalPhotos((prev) => {
        const next = [...prev, ...dataUrls].slice(0, MAX_PHOTOS);
        if (!prev.length && next.length) {
          setModalActiveIndex(0);
        }
        return next;
      });
    } catch (err: any) {
      setPhotoModalError(err.message || "No se pudieron leer las imagenes");
    } finally {
      if (modalPhotoInputRef.current) {
        modalPhotoInputRef.current.value = "";
      }
    }
  };

  const removeModalPhoto = (index: number) => {
    setPhotoModalError(null);
    setModalPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      setModalActiveIndex((current) => {
        if (!next.length) return 0;
        if (current === index) {
          return Math.min(index, next.length - 1);
        }
        if (current > index) {
          return current - 1;
        }
        return current;
      });
      return next;
    });
  };

  const saveModalPhotos = async () => {
    if (!photoModal) return;
    setPhotoModalSaving(true);
    setPhotoModalError(null);
    const photosToSave = modalPhotos.slice(0, MAX_PHOTOS);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photoModal.id, photos: photosToSave })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudieron actualizar las fotos");
      }
      setItems((curr) =>
        curr.map((item) => {
          if (item.id !== photoModal.id) return item;
          const nextExtra = { ...(item.extraData ?? {}) } as Record<string, any>;
          if (photosToSave.length) {
            nextExtra.photos = photosToSave;
          } else {
            delete nextExtra.photos;
          }
          return { ...item, extraData: nextExtra };
        })
      );
      closePhotoModal();
      setMessage("Fotos actualizadas");
    } catch (err: any) {
      setPhotoModalError(err.message || "No se pudieron actualizar las fotos");
    } finally {
      setPhotoModalSaving(false);
    }
  };

  const showPrevModalPhoto = () => {
    if (!modalPhotos.length) return;
    setModalActiveIndex((current) => (current === 0 ? modalPhotos.length - 1 : current - 1));
  };

  const showNextModalPhoto = () => {
    if (!modalPhotos.length) return;
    setModalActiveIndex((current) => (current + 1) % modalPhotos.length);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = window.confirm("¿Deseas agregar este producto al inventario?");
    if (!confirmed) return;
    setPending(true);
    setMessage(null);
    try {
      const anoDesdeSafe = Number.isFinite(anoDesdeNumber as number) ? anoDesdeNumber : undefined;
      const anoHastaSafe = Number.isFinite(anoHastaNumber as number) ? anoHastaNumber : undefined;

      const photosPayload = photoFiles.length
        ? await Promise.all(photoFiles.slice(0, MAX_PHOTOS).map((file) => fileToDataUrl(file)))
        : [];

      const extraDataPayload: Record<string, any> = {
        estatus_interno: toUpper(form.estatusInterno),
        fecha_ingreso: new Date().toISOString(),
        origen: toUpper(form.origen),
        coche: toUpper(form.coche),
        pieza: toUpper(form.pieza),
        marca: toUpper(form.marca),
        ano_desde: anoDesdeSafe,
        ano_hasta: anoHastaSafe,
        ubicacion: toUpper(form.ubicacion),
        precio_compra: form.precioCompra ? Number(form.precioCompra) : undefined
      };

      if (photosPayload.length) {
        extraDataPayload.photos = photosPayload;
      }

      const payload = {
        skuInternal: toUpper(form.skuInternal) ?? "",
        status: "active",
        price: form.price ? Number(form.price) : undefined,
        stock: form.stock ? Number(form.stock) : undefined,
        extraData: extraDataPayload
      };
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear item");
      }
      setForm({
        skuInternal: "",
        estatusInterno: "",
        stock: "",
        pieza: "",
        marca: "",
        coche: "",
        anoDesde: "",
        anoHasta: "",
        origen: "",
        price: "",
        precioCompra: "",
        ubicacion: ""
      });
      setPhotoFiles([]);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      setMessage("Item creado");
      await refresh();
    } catch (err: any) {
      setMessage(err.message || "No se pudo crear");
    } finally {
      setPending(false);
    }
  };

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem("file") as HTMLInputElement) || null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadMessage("Selecciona un archivo");
      return;
    }
    setUploading(true);
    setUploadMessage(null);
    setUploadErrors([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadMessage(data.error || "No se pudo importar");
        setUploadErrors(data.errors || []);
        return;
      }
      setUploadMessage(`Importados: ${data.inserted}`);
      setUploadErrors(data.errors || []);
      await refresh();
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      setUploadMessage(err.message || "No se pudo importar");
    } finally {
      setUploading(false);
    }
  };

  const updateEstatusInterno = useCallback(async (
    id: string,
    value: string,
    overridePrestadoVendidoA?: string | null
  ) => {
    const normalized = value.trim().toUpperCase();
    const nextStatus =
      normalized === "VENDIDO" || normalized === "SIN SUBIR"
        ? "inactive"
        : normalized === "PRESTADO"
        ? "paused"
        : normalized === "ML"
        ? "active"
        : undefined;

    const shouldStampDate = normalized === "PRESTADO" || normalized === "VENDIDO";
    const fechaPrestamoPago = shouldStampDate ? new Date().toISOString() : null;
    const current = items.find((it) => it.id === id);
    const currentPrestadoVendidoA = current?.extraData?.prestado_vendido_a ?? null;
    const hasOverride = typeof overridePrestadoVendidoA !== "undefined";
    const prestadoVendidoA = hasOverride
      ? overridePrestadoVendidoA ?? null
      : currentPrestadoVendidoA;

    const prevItems = items.map((item) => ({
      ...item,
      extraData: item.extraData ? { ...item.extraData } : item.extraData
    }));

    setUpdatingIds((prev) => [...prev, id]);
    setItems((curr) =>
      curr.map((item) =>
        item.id === id
          ? {
              ...item,
              status: nextStatus ?? item.status,
              extraData: {
                ...(item.extraData ?? {}),
                estatus_interno: normalized || undefined,
                fecha_prestamo_pago: shouldStampDate ? fechaPrestamoPago : undefined,
                  prestado_vendido_a: hasOverride
                    ? prestadoVendidoA || undefined
                    : item.extraData?.prestado_vendido_a
              }
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          estatusInterno: normalized || null,
          status: nextStatus,
          fechaPrestamoPago,
          prestadoVendidoA
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      setItems(prevItems);
      setMessage(err.message || "No se pudo actualizar");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  }, [items]);

  const updateOrigen = useCallback(async (id: string, value: string) => {
    const upper = value.trim().toUpperCase();
    const prevItems = items.map((item) => ({
      ...item,
      extraData: item.extraData ? { ...item.extraData } : item.extraData
    }));

    setUpdatingIds((prev) => [...prev, id]);
    setItems((curr) =>
      curr.map((item) =>
        item.id === id
          ? {
              ...item,
              extraData: {
                ...(item.extraData ?? {}),
                origen: upper || undefined
              }
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, origen: upper || null })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      setItems(prevItems);
      setMessage(err.message || "No se pudo actualizar");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  }, [items]);

  const updateUbicacion = useCallback(async (id: string, value: string) => {
    const upper = value.trim().toUpperCase();
    const prevItems = items.map((item) => ({
      ...item,
      extraData: item.extraData ? { ...item.extraData } : item.extraData
    }));

    setUpdatingIds((prev) => [...prev, id]);
    setItems((curr) =>
      curr.map((item) =>
        item.id === id
          ? {
              ...item,
              extraData: {
                ...(item.extraData ?? {}),
                ubicacion: upper || undefined
              }
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ubicacion: upper || null })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      setItems(prevItems);
      setMessage(err.message || "No se pudo actualizar");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  }, [items]);

  const updatePrestadoVendidoA = useCallback(async (id: string, value: string) => {
    const upper = value.trim().toUpperCase();
    const prevItems = items.map((item) => ({
      ...item,
      extraData: item.extraData ? { ...item.extraData } : item.extraData
    }));

    setUpdatingIds((prev) => [...prev, id]);
    setItems((curr) =>
      curr.map((item) =>
        item.id === id
          ? {
              ...item,
              extraData: {
                ...(item.extraData ?? {}),
                prestado_vendido_a: upper || undefined
              }
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, prestadoVendidoA: upper || null })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar");
      }
    } catch (err: any) {
      setItems(prevItems);
      setMessage(err.message || "No se pudo actualizar");
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  }, [items]);

  const updatePrice = useCallback(async (id: string, value: number | null) => {
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setMessage("Precio invalido");
      return;
    }

    const prevItems = items.map((item) => ({
      ...item,
      extraData: item.extraData ? { ...item.extraData } : item.extraData
    }));

    setItems((curr) =>
      curr.map((item) => (item.id === id ? { ...item, price: value ?? null } : item))
    );

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, price: value })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo actualizar el precio");
      }
    } catch (err: any) {
      setItems(prevItems);
      setMessage(err.message || "No se pudo actualizar el precio");
    }
  }, [items]);

  const brandSuggestions = Array.from(
    new Set([
      ...brandOptions,
      ...items
        .map((item) => item.extraData?.marca)
        .filter((m): m is string => Boolean(m && m.trim()))
        .map((m) => m.toUpperCase())
    ])
  ).sort();

  const skuSuggestions = Array.from(
    new Set(
      items
        .map((item) => item.skuInternal)
        .filter((s): s is string => Boolean(s && s.trim()))
        .map((s) => s.toUpperCase())
    )
  ).sort();

  const ubicacionSuggestions = Array.from(
    new Set(
      items
        .map((item) => item.extraData?.ubicacion)
        .filter((u): u is string => Boolean(u && u.trim()))
        .map((u) => u.toUpperCase())
    )
  ).sort();

  const modelOptions = (() => {
    const base = brandModels[form.marca] ?? [];
    const existing = items
      .filter((item) => (item.extraData?.marca ?? "").toString().toUpperCase() === form.marca)
      .map((item) => item.extraData?.coche)
      .filter((c): c is string => Boolean(c && c.trim()))
      .map((c) => c.toUpperCase());
    return Array.from(new Set([...base, ...existing])).sort();
  })();

  const anoDesdeNumber = form.anoDesde ? Number(form.anoDesde) : undefined;
  const anoHastaNumber = form.anoHasta ? Number(form.anoHasta) : undefined;
  const activeModalPhoto = modalPhotos[modalActiveIndex] ?? null;

  const normalizedSearch = search.trim().toLowerCase();
  const searchFilteredItems = useMemo(() => {
    if (!normalizedSearch) return items;
    return items.filter((item) => {
      const haystack = [
        item.skuInternal,
        item.title ?? "",
        item.extraData?.descripcion_local ?? "",
        item.extraData?.descripcion_ml ?? "",
        item.mlItemId ?? "",
        item.sellerCustomField ?? "",
        item.extraData?.estatus_interno ?? "",
        item.extraData?.origen ?? "",
        item.extraData?.coche ?? "",
        item.extraData?.pieza ?? "",
        item.extraData?.marca ?? "",
        item.extraData?.ano_desde ?? "",
        item.extraData?.ano_hasta ?? "",
        item.extraData?.ubicacion ?? "",
        item.extraData?.inventario ?? "",
        item.extraData?.revision ?? "",
        item.extraData?.facebook ?? "",
        item.extraData?.prestado_vendido_a ?? "",
        item.extraData?.fecha_prestamo_pago ?? "",
        String(item.stock ?? ""),
        String(item.price ?? "")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [items, normalizedSearch]);

  const normalizedStatusFilter = statusFilter?.toUpperCase() ?? null;
  const filteredItems = useMemo(() => {
    if (!normalizedStatusFilter) return searchFilteredItems;
    return searchFilteredItems.filter((item) => {
      const current = (item.extraData?.estatus_interno ?? "").toString().trim().toUpperCase();
      const label = current.length ? current : "SIN ESTATUS";
      return label === normalizedStatusFilter;
    });
  }, [searchFilteredItems, normalizedStatusFilter]);

  const statusCounters = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const raw = (item.extraData?.estatus_interno ?? "").toString().trim();
      const key = raw.length ? raw.toUpperCase() : "SIN ESTATUS";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => {
      if (a[1] === b[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    });
  }, [items]);

  const rowClassRules = useMemo(
    () => ({
      "row-vendido": (params: any) =>
        (params.data?.extraData?.estatus_interno ?? "").toString().toUpperCase() === "VENDIDO",
      "row-prestado": (params: any) =>
        (params.data?.extraData?.estatus_interno ?? "").toString().toUpperCase() === "PRESTADO"
    }),
    []
  );

  const handleCellKeyDown = useCallback((event: CellKeyDownHandlerEvent) => {
    if (event.event?.key === "Enter") {
      event.api.stopEditing?.();
      event.event?.preventDefault();
    }
  }, []);

  const handleSelectionChanged = useCallback((event: SelectionChangedEventLite) => {
    const rows = (event.api.getSelectedRows?.() ?? []) as Item[];
    setSelectedIds(rows.map((row) => row.id));
    if (!rows.length && !event.api.getFocusedCell?.()) {
      setFocusedRowInfo(null);
    }
  }, []);

  const handleRowSelected = useCallback((event: RowSelectedEventLite) => {
    if (event.node.isSelected() && event.node.data) {
      setFocusedRowInfo(toFocusedInfo(event.node.data as Item));
      return;
    }
    if (!event.api.getFocusedCell?.() && (event.api.getSelectedRows?.().length ?? 0) === 0) {
      setFocusedRowInfo(null);
    }
  }, []);

  const handleCellFocused = useCallback((event: CellFocusedEventLite) => {
    if (event.rowIndex == null || event.rowIndex < 0) {
      setFocusedRowInfo(null);
      return;
    }
    const data = event.api?.getDisplayedRowAtIndex?.(event.rowIndex)?.data as Item | undefined;
    setFocusedRowInfo(toFocusedInfo(data));
  }, []);

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 120
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
    {
      headerName: "Sel",
      checkboxSelection: true,
      headerCheckboxSelection: true,
      maxWidth: 50,
      pinned: "left",
      lockPosition: true,
      filter: false,
      sortable: false
    },
    {
      headerName: "Estatus",
      field: "status",
      valueFormatter: (p: any) => p.value ?? "-",
      maxWidth: 120
    },
    {
      headerName: "Estatus interno",
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: sortedEstatusInternoOptions
      },
      cellEditorPopup: true,
      valueGetter: (p: any) => p.data.extraData?.estatus_interno ?? "",
      cellRenderer: (p: any) => (
        <span className="block text-xs text-black w-full leading-5 truncate">{p.value || "-"}</span>
      ),
      cellStyle: {
        display: "flex",
        alignItems: "center",
        padding: "0 8px"
      },
      onCellClicked: (p: any) => {
        p.api.startEditingCell({ rowIndex: p.rowIndex, colKey: p.column.getId() });
      },
      valueSetter: (p: any) => {
        const val = (p.newValue ?? "").toString().toUpperCase();
        const existingBuyer = (p.data.extraData?.prestado_vendido_a ?? "").toString();
        let overrideBuyer: string | null | undefined = undefined;

        if (val === "VENDIDO" || val === "PRESTADO") {
          const question = val === "VENDIDO" ? "¿A quien se vendio?" : "¿A quien se presto?";
          const errorText = val === "VENDIDO" ? "Debes indicar a quien se vendio" : "Debes indicar a quien se presto";
          const response = window.prompt(question, existingBuyer);
          if (response === null) {
            setMessage("Actualizacion cancelada");
            return false;
          }
          const cleaned = response.trim();
          if (!cleaned.length) {
            setMessage(errorText);
            return false;
          }
          overrideBuyer = cleaned.toUpperCase();
        }

        const nextExtra = {
          ...(p.data.extraData ?? {}),
          estatus_interno: val,
          ...(overrideBuyer !== undefined ? { prestado_vendido_a: overrideBuyer || undefined } : {})
        };

        p.data.extraData = nextExtra;
        setItems((curr) =>
          curr.map((row) =>
            row.id === p.data.id
              ? {
                  ...row,
                  extraData: {
                    ...(row.extraData ?? {}),
                    estatus_interno: val,
                    ...(overrideBuyer !== undefined
                      ? { prestado_vendido_a: overrideBuyer || undefined }
                      : {})
                  }
                }
              : row
          )
        );
        updateEstatusInterno(p.data.id, val, overrideBuyer);
        return true;
      },
      maxWidth: 170
    },
    {
      headerName: "SKU",
      field: "skuInternal",
      maxWidth: 140
    },
    {
      headerName: "Descripcion",
      valueGetter: (p: any) => {
        const extra = p.data.extraData ?? {};
        const yearSegment = extra.ano_desde || extra.ano_hasta
          ? extra.ano_desde && extra.ano_hasta && extra.ano_desde !== extra.ano_hasta
            ? `${extra.ano_desde}-${extra.ano_hasta}`
            : extra.ano_desde ?? extra.ano_hasta
          : "";
        const parts = [extra.pieza, extra.marca, extra.coche, yearSegment, p.data.skuInternal]
          .map((part) => (part ?? "").toString().trim())
          .filter((part) => part.length);
        return parts.length ? parts.join(" ") : "-";
      },
      minWidth: 220
    },
    {
      headerName: "Descripcion ML",
      valueGetter: (p: any) => p.data.extraData?.descripcion_ml ?? "-",
      minWidth: 220
    },
    {
      headerName: "Stock",
      field: "stock",
      maxWidth: 100,
      filter: "agNumberColumnFilter",
      cellStyle: { textAlign: "right" }
    },
    {
      headerName: "Pieza",
      valueGetter: (p: any) => p.data.extraData?.pieza ?? "-",
      maxWidth: 150
    },
    {
      headerName: "Marca",
      valueGetter: (p: any) => p.data.extraData?.marca ?? "-",
      maxWidth: 140
    },
    {
      headerName: "Coche",
      valueGetter: (p: any) => p.data.extraData?.coche ?? "-",
      maxWidth: 160
    },
    {
      headerName: "Año",
      valueGetter: (p: any) =>
        p.data.extraData?.ano_desde || p.data.extraData?.ano_hasta
          ? `${p.data.extraData?.ano_desde ?? "-"}-${p.data.extraData?.ano_hasta ?? "-"}`
          : "-",
      maxWidth: 130,
      filter: "agNumberColumnFilter"
    },
    {
      headerName: "Origen",
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: sortedOrigenOptions
      },
      valueGetter: (p: any) => p.data.extraData?.origen ?? "",
      valueSetter: (p: any) => {
        const val = (p.newValue ?? "").toString().toUpperCase();
        const nextExtra = {
          ...(p.data.extraData ?? {}),
          origen: val
        };
        p.data.extraData = nextExtra;
        setItems((curr) =>
          curr.map((row) =>
            row.id === p.data.id
              ? {
                  ...row,
                  extraData: {
                    ...(row.extraData ?? {}),
                    origen: val
                  }
                }
              : row
          )
        );
        updateOrigen(p.data.id, val);
        return true;
      },
      maxWidth: 160
    },
    {
      headerName: "Precio",
      field: "price",
      editable: true,
      valueFormatter: (p: any) => formatCurrencyMx(p.value),
      valueSetter: (p: any) => {
        const raw = (p.newValue ?? "").toString();
        const trimmed = raw.replace(/[$,\s]/g, "").trim();
        if (!trimmed.length) {
          p.data.price = null;
          updatePrice(p.data.id, null);
          return true;
        }
        const priceValue = Number(trimmed);
        if (Number.isNaN(priceValue) || priceValue < 0) {
          setMessage("Precio invalido");
          return false;
        }
        p.data.price = priceValue;
        updatePrice(p.data.id, priceValue);
        return true;
      },
      maxWidth: 130,
      cellStyle: { textAlign: "right", paddingRight: "12px" }
    },
    {
      headerName: "Precio de compra",
      valueGetter: (p: any) => p.data.extraData?.precio_compra ?? null,
      valueFormatter: (p: any) => formatCurrencyMx(p.value),
      maxWidth: 150,
      filter: "agNumberColumnFilter",
      cellStyle: { textAlign: "right" }
    },
    {
      headerName: "Ubicacion",
      editable: true,
      valueGetter: (p: any) => p.data.extraData?.ubicacion ?? "",
      valueSetter: (p: any) => {
        const val = (p.newValue ?? "").toString().toUpperCase();
        const nextExtra = {
          ...(p.data.extraData ?? {}),
          ubicacion: val
        };
        p.data.extraData = nextExtra;
        setItems((curr) =>
          curr.map((row) =>
            row.id === p.data.id
              ? {
                  ...row,
                  extraData: {
                    ...(row.extraData ?? {}),
                    ubicacion: val
                  }
                }
              : row
          )
        );
        updateUbicacion(p.data.id, val);
        return true;
      },
      maxWidth: 140
    },
    {
      headerName: "Codigo de Mercado Libre",
      field: "mlItemId",
      maxWidth: 180
    },
    {
      headerName: "Prestado a/Vendido a",
      editable: true,
      valueGetter: (p: any) => p.data.extraData?.prestado_vendido_a ?? "",
      valueSetter: (p: any) => {
        const val = (p.newValue ?? "").toString().toUpperCase();
        setItems((curr) =>
          curr.map((row) =>
            row.id === p.data.id
              ? {
                  ...row,
                  extraData: {
                    ...(row.extraData ?? {}),
                    prestado_vendido_a: val
                  }
                }
              : row
          )
        );
        updatePrestadoVendidoA(p.data.id, val);
        return true;
      },
      minWidth: 180
    },
    {
      headerName: "Fecha de ingreso",
      valueGetter: (p: any) => p.data.extraData?.fecha_ingreso ?? "",
      valueFormatter: (p: any) => (p.value ? formatDate(p.value) : "-"),
      maxWidth: 150,
      editable: false
    },
    {
      headerName: "Fecha prestamo",
      valueGetter: (p: any) => p.data.extraData?.fecha_prestamo_pago ?? "",
      valueFormatter: (p: any) => (p.value ? formatDate(p.value) : "-"),
      maxWidth: 170,
      editable: false
    },
    {
      headerName: "Facebook",
      valueGetter: (p: any) => p.data.extraData?.facebook ?? "-",
      maxWidth: 140
    },
    {
      headerName: "Inventario",
      valueGetter: (p: any) => p.data.extraData?.inventario ?? "-",
      maxWidth: 140
    },
    {
      headerName: "Revision",
      valueGetter: (p: any) => p.data.extraData?.revision ?? "-",
      maxWidth: 140
    },
    {
      headerName: "Descripcion local",
      valueGetter: (p: any) => {
        const base = (p.data.extraData?.descripcion_local ?? "").toString().trim();
        const origen = (p.data.extraData?.origen ?? "").toString().trim().toUpperCase();
        if (origen === "NUEVO ORIGINAL") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${nuevoOriginalDescripcion}`;
        }
        if (origen === "NUEVO ORIGINAL CON DETALLE") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${nuevoOriginalDetalleDescripcion}`;
        }
        if (origen === "TW/GENERICO") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${twGenericoDescripcion}`;
        }
        if (origen === "TW/GENERICO CON DETALLE") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${twGenericoDetalleDescripcion}`;
        }
        if (origen === "USADO ORIGINAL SANO") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${usadoOriginalSanoDescripcion}`;
        }
        if (origen === "USADO ORIGINAL CON DETALLE") {
          const prefix = base ? `${base}\n\n` : "";
          return `${prefix}${usadoOriginalDetalleDescripcion}`;
        }
        return base || "-";
      },
      minWidth: 200
    },
    {
      headerName: "Codigo universal",
      field: "sellerCustomField",
      maxWidth: 160
    },
    {
      headerName: "Fotos",
      valueGetter: (p: any) => sanitizePhotos(p.data.extraData?.photos),
      cellRenderer: (p: any) => {
        const photos = sanitizePhotos(p.value);
        const count = photos.length;
        return (
          <button
            type="button"
            className="text-xs text-teal-300 hover:text-teal-200 underline underline-offset-2"
            onClick={() =>
              openPhotoModal(p.data.id, p.data.skuInternal || "Item", photos)
            }
          >
            {count ? `Ver/editar (${count})` : "Agregar fotos"}
          </button>
        );
      },
      minWidth: 140,
      sortable: false,
      filter: false
    },
    {
      headerName: "Acciones",
      cellRenderer: (p: any) => (
        <button
          type="button"
          className="text-red-300 hover:text-red-200 text-xs"
          onClick={() => requestDeleteAuthorization([p.data.id])}
        >
          Borrar
        </button>
      ),
      width: 90,
      pinned: "right",
      filter: false,
      sortable: false
    }
    ],
    [
      openPhotoModal,
      requestDeleteAuthorization,
      sortedEstatusInternoOptions,
      sortedOrigenOptions,
      updateEstatusInterno,
      updateOrigen,
      updatePrestadoVendidoA,
      updatePrice,
      updateUbicacion
    ]
  );

  return (
    <>
      <main className="min-h-screen px-6 py-8">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <header className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-400">Inventario</p>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">Stock y precios</h1>
              <a
                href="/api/auth/signout"
                className="text-sm text-slate-200 border border-slate-600 rounded-md px-3 py-1 hover:border-amber-400"
              >
                Cerrar sesion
              </a>
            </div>
            <p className="text-slate-300 text-sm">Carga manual o importa Excel. Encabezados aceptados: SKU/CODIGO, DESCRIPCION o DESCRIPCION ML o DESCRIPCION LOCAL, PRECIO, INVENTARIO/STOCK/CANTIDAD, CODIGO DE MERCADO LIBRE, CODIGO UNIVERSAL, ESTATUS (active/paused/inactive), ESTATUS INTERNO, ORIGEN, MARCA, COCHE, AÑO DESDE, AÑO HASTA, UBICACION, FACEBOOK, PIEZA.</p>
          </header>

        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow space-y-4">
          <h2 className="text-lg font-semibold">Carga manual</h2>
          <form
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            onSubmit={onSubmit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
          >
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="SKU interno *"
              list="sku-options"
              value={form.skuInternal}
              onChange={(e) => setForm((f) => ({ ...f, skuInternal: e.target.value.toUpperCase() }))}
              required
            />
            <select
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={form.estatusInterno}
              onChange={(e) => setForm((f) => ({ ...f, estatusInterno: e.target.value }))}
            >
              <option value="">Estatus interno</option>
              {sortedEstatusInternoOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Pieza"
              value={form.pieza}
              onChange={(e) => setForm((f) => ({ ...f, pieza: e.target.value.toUpperCase() }))}
              list="pieza-options"
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              list="brand-options"
              placeholder="Marca"
              value={form.marca}
              onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value.toUpperCase(), coche: "" }))}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              list="model-options"
              placeholder={form.marca ? "Coche" : "Coche (elige o escribe)"}
              value={form.coche}
              onChange={(e) => setForm((f) => ({ ...f, coche: e.target.value.toUpperCase() }))}
              disabled={!form.marca && modelOptions.length > 0}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Año desde"
              type="number"
              min="1950"
              max="2100"
              value={form.anoDesde}
              onChange={(e) => setForm((f) => ({ ...f, anoDesde: e.target.value }))}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Año hasta"
              type="number"
              min="1950"
              max="2100"
              value={form.anoHasta}
              onChange={(e) => setForm((f) => ({ ...f, anoHasta: e.target.value }))}
            />
            <select
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              value={form.origen}
              onChange={(e) => setForm((f) => ({ ...f, origen: e.target.value }))}
            >
              <option value="">Origen</option>
              {sortedOrigenOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Precio"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Precio de compra"
              value={form.precioCompra}
              onChange={(e) => setForm((f) => ({ ...f, precioCompra: e.target.value }))}
            />
            <input
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              list="ubicacion-options"
              placeholder="Ubicacion"
              value={form.ubicacion}
              onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value.toUpperCase() }))}
            />
            <div className="sm:col-span-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Fotos (hasta {MAX_PHOTOS} imagenes)</span>
                <span>
                  {photoFiles.length} / {MAX_PHOTOS}
                </span>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:uppercase file:tracking-widest"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (!files.length) return;
                  setPhotoFiles((prev) => {
                    const combined = [...prev, ...files];
                    const unique: File[] = [];
                    combined.forEach((file) => {
                      if (
                        !unique.some(
                          (existing) =>
                            existing.name === file.name &&
                            existing.size === file.size &&
                            existing.lastModified === file.lastModified
                        )
                      ) {
                        unique.push(file);
                      }
                    });
                    if (unique.length > MAX_PHOTOS) {
                      setMessage(`Maximo ${MAX_PHOTOS} fotos por producto`);
                    }
                    return unique.slice(0, MAX_PHOTOS);
                  });
                  e.currentTarget.value = "";
                }}
              />
              {photoFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {photoFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-xs text-slate-200"
                      >
                        <p className="truncate" title={file.name}>
                          {file.name}
                        </p>
                        <button
                          type="button"
                          className="mt-2 text-[11px] text-amber-300 hover:text-amber-200"
                          onClick={() =>
                            setPhotoFiles((prev) => prev.filter((_, idx) => idx !== index))
                          }
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-300 underline underline-offset-2"
                    onClick={() => {
                      setPhotoFiles([]);
                      if (photoInputRef.current) {
                        photoInputRef.current.value = "";
                      }
                    }}
                  >
                    Limpiar todas
                  </button>
                </div>
              )}
            </div>
            <datalist id="sku-options">
              {skuSuggestions.map((sku) => (
                <option key={sku} value={sku} />
              ))}
            </datalist>
            <datalist id="brand-options">
              {brandSuggestions.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
            <datalist id="model-options">
              {modelOptions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            <datalist id="ubicacion-options">
              {ubicacionSuggestions.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <datalist id="pieza-options">
              {Array.from(
                new Set(
                  items
                    .map((item) => item.extraData?.pieza)
                    .filter((p): p is string => Boolean(p && p.trim()))
                )
              )
                .sort()
                .map((pieza) => (
                <option key={pieza} value={pieza} />
              ))}
            </datalist>
            <div className="sm:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
              >
                {pending ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                disabled={!selectedIds.length}
                onClick={() => requestDeleteAuthorization(selectedIds)}
                className="px-4 py-2 rounded-md border border-red-500 text-red-200 text-sm hover:bg-red-500/20 disabled:opacity-60"
              >
                Borrar seleccionados
              </button>
              {message && <span className="text-sm text-amber-300">{message}</span>}
            </div>
          </form>
        </section>

        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Importar Excel</h2>
            <button
              type="button"
              onClick={downloadTemplate}
              disabled={downloading}
              className="px-3 py-2 rounded-md border border-slate-600 text-sm text-slate-100 hover:border-amber-400 disabled:opacity-60"
            >
              {downloading ? "Descargando..." : "Descargar plantilla"}
            </button>
          </div>
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={onUpload}>
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,.csv"
              className="text-sm text-slate-200"
            />
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-teal-700 disabled:opacity-60"
            >
              {uploading ? "Importando..." : "Importar"}
            </button>
          </form>
          {uploadMessage && <p className="text-sm text-amber-300">{uploadMessage}</p>}
          {uploadErrors.length > 0 && (
            <div className="text-xs text-slate-200 space-y-1">
              {uploadErrors.slice(0, 5).map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
              {uploadErrors.length > 5 && <div>... y mas ({uploadErrors.length - 5})</div>}
            </div>
          )}
          <p className="text-xs text-slate-400">Encabezados soportados: ESTATUS, DESCRIPCION, DESCRIPCION ML, DESCRIPCION LOCAL, PRECIO, CODIGO, STOCK, CODIGO UNIVERSAL, CODIGO DE MERCADO LIBRE, ESTATUS INTERNO, ORIGEN, MARCA, COCHE, AÑO DESDE, AÑO HASTA, UBICACION, FACEBOOK, PIEZA.</p>
        </section>

        <section className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Inventario cargado</h2>
              <p className="text-xs text-slate-400">Selecciona filas para borrar, busca por SKU, titulo o codigo de Mercado Libre.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full sm:w-64 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
              <span className="text-xs text-slate-400">
                Mostrando {filteredItems.length} de {items.length}
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Seleccion actual</p>
              {focusedRowInfo && (
                <span className="text-[11px] text-slate-500">Se actualiza al cambiar de celda</span>
              )}
            </div>
            {focusedRowInfo ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-400">SKU</p>
                  <p className="text-xl font-semibold tracking-wide text-slate-100">{focusedRowInfo.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Coche</p>
                  <p className="text-xl font-semibold text-slate-100">{focusedRowInfo.coche}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Año</p>
                  <p className="text-xl font-semibold text-slate-100">{focusedRowInfo.ano}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Descripción</p>
                  <p className="text-xl font-semibold text-slate-100">
                    {(() => {
                      const item = items.find((it) => it.skuInternal === focusedRowInfo.sku);
                      if (!item) return "-";
                      const extra = item.extraData ?? {};
                      const yearSegment = extra.ano_desde || extra.ano_hasta
                        ? extra.ano_desde && extra.ano_hasta && extra.ano_desde !== extra.ano_hasta
                          ? `${extra.ano_desde}-${extra.ano_hasta}`
                          : extra.ano_desde ?? extra.ano_hasta
                        : "";
                      const parts = [extra.pieza, extra.marca, extra.coche, yearSegment, item.skuInternal]
                        .map((part) => (part ?? "").toString().trim())
                        .filter((part) => part.length);
                      return parts.length ? parts.join(" ") : "-";
                    })()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">
                Selecciona una celda o marca un registro para ver el SKU, el coche, el rango de años y la descripción.
              </p>
            )}
          </div>
          {statusCounters.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 p-3 text-[11px] uppercase tracking-wide text-slate-200">
              {statusCounters.map(([label, count]) => {
                const isActive = statusFilter === label;
                const baseClasses = "flex items-center gap-2 rounded-xl border px-3 py-1 text-left transition focus:outline-none";
                const activeClasses = isActive
                  ? "border-amber-400 bg-amber-400/20 text-amber-100"
                  : "border-slate-600 bg-slate-800/70 hover:border-amber-300";
                return (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setStatusFilter(isActive ? null : label)}
                    className={`${baseClasses} ${activeClasses}`}
                  >
                    <span className="text-base font-bold text-amber-300">{count}</span>
                    <span className="font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div
            className="ag-theme-quartz rounded-xl border border-slate-700 shadow-inner"
            style={{ height: 600 }}
          >
            <AgGridReact
              rowData={filteredItems}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              getRowId={(params: any) => params.data.id}
              onGridReady={(event: any) => setGridApi(event.api)}
              rowHeight={28}
              headerHeight={34}
              rowSelection="multiple"
              rowDeselection={false}
              suppressRowClickSelection
              enableCellTextSelection={true}
              enableRangeSelection
              animateRows
              copyHeadersToClipboard
              quickFilterText={search}
              onCellKeyDown={handleCellKeyDown}
              onCellFocused={handleCellFocused}
              onRowSelected={handleRowSelected}
              onSelectionChanged={handleSelectionChanged}
              rowClassRules={rowClassRules}
            />
          </div>
        </section>
      </div>
      </main>
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Fotos {photoModal.title ? `(${photoModal.title})` : ""}
              </h3>
              <button
                type="button"
                className="text-sm text-slate-300 hover:text-amber-300"
                onClick={closePhotoModal}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Fotos guardadas</span>
                <span>
                  {modalPhotos.length} / {MAX_PHOTOS}
                </span>
              </div>
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[2fr,1fr]">
                <div className="space-y-3">
                  {modalPhotos.length ? (
                    <>
                      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
                        <img
                          src={activeModalPhoto || ""}
                          alt={`Foto ${modalActiveIndex + 1}`}
                          className="h-full w-full object-contain"
                        />
                        {modalPhotos.length > 1 && (
                          <>
                            <button
                              type="button"
                              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white hover:bg-black/80"
                              onClick={showPrevModalPhoto}
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white hover:bg-black/80"
                              onClick={showNextModalPhoto}
                            >
                              ›
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-rose-200 hover:bg-black/80"
                          onClick={() => removeModalPhoto(modalActiveIndex)}
                        >
                          Quitar esta foto
                        </button>
                        <div className="absolute bottom-3 right-4 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white">
                          {modalActiveIndex + 1} / {modalPhotos.length}
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {modalPhotos.map((src, index) => (
                          <div
                            key={`${src}-${index}`}
                            className={`relative rounded-lg border ${
                              index === modalActiveIndex
                                ? "border-amber-400"
                                : "border-slate-700"
                            } bg-slate-800 p-1`}
                          >
                            <button
                              type="button"
                              className="block h-16 w-16 overflow-hidden rounded-md"
                              onClick={() => setModalActiveIndex(index)}
                            >
                              <img src={src} alt={`Thumb ${index + 1}`} className="h-full w-full object-cover" />
                            </button>
                            <button
                              type="button"
                              className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black/90"
                              onClick={() => removeModalPhoto(index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">Sin fotos para este registro.</p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400">Agregar nuevas fotos</p>
                    <input
                      ref={modalPhotoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="w-full rounded-md bg-slate-800 border border-slate-600 px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-[10px] file:uppercase file:tracking-widest"
                      onChange={(e) => handleModalFileSelection(e.target.files)}
                    />
                  </div>
                  {photoModalError && <p className="text-xs text-rose-300">{photoModalError}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:border-amber-300"
                  onClick={closePhotoModal}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  onClick={saveModalPhotos}
                  disabled={photoModalSaving}
                >
                  {photoModalSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
