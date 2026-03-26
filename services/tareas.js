import axios from 'axios';

const API_URL = 'http://localhost:8080/tasks';

export const listarTareas = async () => {
  const response = await axios.get(API_URL);
  return response.data;
}

export const crearTarea = async (tarea) => {
  const response = await axios.post(API_URL, tarea);
  return response.data;
}

export const actualizarTarea = async (tarea) => {
  const response = await axios.put(`${API_URL}/update`, tarea);
  return response.data;
}

export const eliminarTarea = async (id) => {
  await axios.delete(`${API_URL}/delete?id=${id}`);
}
