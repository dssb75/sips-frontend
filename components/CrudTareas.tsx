"use client"

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8080/tareas";

interface Tarea {
  id: number;
  descripcion: string;
  completada: boolean;
}

export default function CrudTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    const cargarTareas = async () => {
      try {
        const res = await axios.get(API_URL);
        setTareas(res.data);
      } catch (err) {
        console.error("Error al listar tareas:", err);
      }
    };
    cargarTareas();
  }, []);

  const handleCrear = async () => {
    if (!descripcion) return;
    try {
      await axios.post(`${API_URL}/crear`, { descripcion, completada: false });
      setDescripcion("");
      const res = await axios.get(API_URL);
      setTareas(res.data);
    } catch (err) {
      console.error("Error al crear tarea:", err);
    }
  };

  const toggleCompletada = async (tarea: Tarea) => {
    try {
      await axios.put(`${API_URL}/actualizar`, { ...tarea, completada: !tarea.completada });
      const res = await axios.get(API_URL);
      setTareas(res.data);
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/eliminar`, { data: { id } });
      const res = await axios.get(API_URL);
      setTareas(res.data);
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  const iniciarEdicion = (tarea: Tarea) => {
    setEditId(tarea.id);
    setEditDesc(tarea.descripcion);
  };

  const guardarEdicion = async (id: number) => {
    try {
      await axios.put(`${API_URL}/actualizar`, {
        id,
        descripcion: editDesc,
        completada: tareas.find((t) => t.id === id)?.completada ?? false,
      });
      setEditId(null);
      setEditDesc("");
      const res = await axios.get(API_URL);
      setTareas(res.data);
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6">Tareas</h1>

      <div className="flex mb-6 w-full max-w-md">
        <input
          type="text"
          placeholder="Nueva tarea"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="flex-grow p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleCrear}
          className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
        >
          Agregar
        </button>
      </div>

      <ul className="w-full max-w-md space-y-3">
        {tareas.map((t) => (
          <li
            key={t.id}
            className="bg-white p-4 rounded shadow flex items-center justify-between"
          >
            {editId === t.id ? (
              <div className="flex flex-grow items-center space-x-2">
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => guardarEdicion(t.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex flex-grow items-center justify-between">
                <span
                  onClick={() => toggleCompletada(t)}
                  className={`cursor-pointer flex-grow ${
                    t.completada ? "line-through text-gray-400" : ""
                  }`}
                >
                  {t.descripcion}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => iniciarEdicion(t)}
                    className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(t.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}