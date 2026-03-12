import axios from 'axios';

const API_URL = 'http://localhost:8080/tareas';

export const listarTareas = async () => {
  const response = await axios.get(API_URL);
  return response.data;
}

export const crearTarea = async (tarea) => {
  await axios.post(API_URL, tarea);
}       

export const actualizarTarea = async (tarea) => {
  await axios.put(`${API_URL}/${tarea.id}`, tarea);
}

export const eliminarTarea = async (id) => {
  await axios.delete(`${API_URL}/${id}`);
}
