"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSindicato, deleteSindicato, listSindicatos, Sindicato, updateSindicato } from "@/services/calendar";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type UpsertFormState = {
  nombre: string;
  estado: "Activo" | "Inactivo";
};

export default function SindicatosPage() {
  const [items, setItems] = useState<Sindicato[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<UpsertFormState>({ nombre: "", estado: "Activo" });
  const [editingItem, setEditingItem] = useState<Sindicato | null>(null);
  const [editForm, setEditForm] = useState<UpsertFormState>({ nombre: "", estado: "Activo" });
  const [deletingItem, setDeletingItem] = useState<Sindicato | null>(null);
  const [filterName, setFilterName] = useState("");
  const [filterEstado, setFilterEstado] = useState<"Todos" | "Activo" | "Inactivo">("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listSindicatos();
      setItems(response);
      setSelectedIds(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el listado de sindicatos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedName = filterName.trim().toLowerCase();

    return items.filter((item) => {
      if (normalizedName && !item.nombre.toLowerCase().includes(normalizedName)) {
        return false;
      }

      const itemEstado = (item.estado || "Activo").toLowerCase();
      if (filterEstado !== "Todos" && itemEstado !== filterEstado.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [filterEstado, filterName, items]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterEstado]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({ nombre: "", estado: "Activo" });
  };

  const hasOpenModal = showCreateModal || editingItem !== null || deletingItem !== null;

  useEffect(() => {
    if (!hasOpenModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();

        if (deletingItem) {
          if (deletingId === deletingItem.id) {
            return;
          }
          setDeletingItem(null);
          return;
        }

        if (editingItem) {
          if (updatingId === editingItem.id) {
            return;
          }
          cancelUpdate();
          return;
        }

        if (showCreateModal) {
          if (creating) {
            return;
          }
          closeCreateModal();
          return;
        }

        return;
      }

      if (event.key === "Enter" && deletingItem && deletingId !== deletingItem.id) {
        event.preventDefault();
        void handleDelete();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    creating,
    deletingId,
    deletingItem,
    editingItem,
    hasOpenModal,
    showCreateModal,
    updatingId,
  ]);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombre = createForm.nombre.trim();
    if (!nombre) {
      setError("El nombre es obligatorio.");
      return;
    }

    setCreating(true);
    setError(null);
    setInfo(null);
    try {
      await createSindicato({ nombre, estado: createForm.estado });
      setInfo("Sindicato creado.");
      closeCreateModal();
      await loadItems();
      setCurrentPage(totalPages);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el sindicato.");
    } finally {
      setCreating(false);
    }
  };

  const startUpdate = (item: Sindicato) => {
    setEditingItem(item);
    setEditForm({
      nombre: item.nombre,
      estado: item.estado === "Inactivo" ? "Inactivo" : "Activo",
    });
    setError(null);
    setInfo(null);
  };

  const cancelUpdate = () => {
    setEditingItem(null);
    setEditForm({ nombre: "", estado: "Activo" });
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingItem) {
      return;
    }

    const nombre = editForm.nombre.trim();
    if (!nombre) {
      setError("El nombre es obligatorio.");
      return;
    }

    setUpdatingId(editingItem.id);
    setError(null);
    setInfo(null);
    try {
      await updateSindicato(editingItem.id, { nombre, estado: editForm.estado });
      setInfo("Sindicato actualizado.");
      cancelUpdate();
      await loadItems();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el sindicato.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) {
      return;
    }

    setDeletingId(deletingItem.id);
    setError(null);
    setInfo(null);
    try {
      await deleteSindicato(deletingItem.id);
      setInfo("Sindicato eliminado.");
      setDeletingItem(null);
      await loadItems();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el sindicato.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPaged = () => {
    const ids = pagedItems.map((item) => item.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    setBulkDeleting(true);
    setError(null);
    setInfo(null);

    const ids = Array.from(selectedIds);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteSindicato(id);
        deleted++;
      } catch {
        // continue deleting the rest
      }
    }

    if (deleted === ids.length) {
      setInfo(`Se eliminaron ${deleted} sindicato(s).`);
    } else {
      setError(`Se eliminaron ${deleted} de ${ids.length} sindicatos seleccionados.`);
    }

    await loadItems();
    setBulkDeleting(false);
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Modulo de sindicatos</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">Listado de sindicatos</h1>        
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={selectedIds.size === 0 || bulkDeleting}
              className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {bulkDeleting ? "Eliminando..." : `Eliminar seleccionados (${selectedIds.size})`}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              disabled={creating}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{info}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Filtros de busqueda</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Nombre
            <input
              type="text"
              value={filterName}
              onChange={(event) => setFilterName(event.target.value)}
              placeholder="Buscar por nombre"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Estado
            <select
              value={filterEstado}
              onChange={(event) => setFilterEstado(event.target.value as "Todos" | "Activo" | "Inactivo")}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="Todos">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            setFilterName("");
            setFilterEstado("Todos");
          }}
          className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando sindicatos...</p>
        ) : filteredItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
            No hay resultados para los filtros aplicados.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={pagedItems.length > 0 && pagedItems.every((item) => selectedIds.has(item.id))}
                        onChange={toggleSelectAllPaged}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.nombre}</td>
                      <td className="px-4 py-3">{item.estado || "Activo"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startUpdate(item)}
                            disabled={updatingId === item.id || deletingId === item.id}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {updatingId === item.id ? "Actualizando..." : "Actualizar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItem(item)}
                            disabled={deletingId === item.id || updatingId === item.id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Pagina {safeCurrentPage} de {totalPages} · Mostrando {filteredItems.length} de {items.length}
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} / pág.</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Agregar sindicato">
            <h2 className="text-lg font-semibold text-slate-800">Agregar sindicato</h2>
            <form onSubmit={(event) => void handleCreateSubmit(event)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  type="text"
                  value={createForm.nombre}
                  onChange={(event) => setCreateForm((current) => ({ ...current, nombre: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select
                  value={createForm.estado}
                  onChange={(event) => setCreateForm((current) => ({ ...current, estado: event.target.value as "Activo" | "Inactivo" }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Actualizar sindicato">
            <h2 className="text-lg font-semibold text-slate-800">Actualizar sindicato</h2>
            <form onSubmit={(event) => void handleUpdateSubmit(event)} className="mt-4 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Nombre
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(event) => setEditForm((current) => ({ ...current, nombre: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Estado
                <select
                  value={editForm.estado}
                  onChange={(event) => setEditForm((current) => ({ ...current, estado: event.target.value as "Activo" | "Inactivo" }))}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={updatingId === editingItem.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {updatingId === editingItem.id ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={cancelUpdate}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-label="Eliminar sindicato">
            <h2 className="text-lg font-semibold text-slate-800">Eliminar sindicato</h2>
            <p className="mt-3 text-sm text-slate-600">
              Se eliminara el sindicato {deletingItem.nombre}. Esta accion no se puede deshacer.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deletingId === deletingItem.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingId === deletingItem.id ? "Eliminando..." : "Eliminar"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
