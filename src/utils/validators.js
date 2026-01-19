export const validators = {
	required: (v) => !!v || 'Campo obligatorio',
	minCantidad: (v) => (v !== null && v > 0) || 'Mínimo 1',
	number: (v) => (!isNaN(parseFloat(v)) && isFinite(v)) || 'Debe ser un número',
};
