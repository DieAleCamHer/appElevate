// utils/calcularPorcentaje.js
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// ✅ Calcula el avance de subtareas y actualiza la tarea
export const calcularAvanceSubtareas = async (tareaId) => {
  try {
    const q = query(collection(db, 'subtareas'), where('tareaId', '==', tareaId));
    const querySnapshot = await getDocs(q);
    const subtareas = querySnapshot.docs.map(doc => doc.data());

    if (subtareas.length === 0) return 0;

    const completadas = subtareas.filter(sub => sub.completado).length;
    const porcentaje = Math.round((completadas / subtareas.length) * 100);

    const tareaRef = doc(db, 'tareas', tareaId);
    await updateDoc(tareaRef, { avance: porcentaje });

    return porcentaje;
  } catch (error) {
    console.error('Error al calcular avance de subtareas:', error);
    return 0;
  }
};

// ✅ Calcula el avance de tareas y actualiza el proyecto
export const calcularAvanceTareas = async (proyectoId) => {
  try {
    const q = query(collection(db, 'tareas'), where('proyectoId', '==', proyectoId));
    const querySnapshot = await getDocs(q);
    const tareas = querySnapshot.docs.map(doc => doc.data());

    if (tareas.length === 0) return 0;

    const completadas = tareas.filter(t => t.avance === 100).length;
    const porcentaje = Math.round((completadas / tareas.length) * 100);

    const proyectoRef = doc(db, 'proyectos', proyectoId);
    await updateDoc(proyectoRef, { avance: porcentaje });

    return porcentaje;
  } catch (error) {
    console.error('Error al calcular avance de tareas:', error);
    return 0;
  }
};
