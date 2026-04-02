type ValidationResult = true | string;

export const validators = {
	required: (v: unknown): ValidationResult => !!v || 'Campo obligatorio',
	minCantidad: (v: number | null): ValidationResult =>
		(v !== null && v > 0) || 'Mínimo 1',
	number: (v: string | number): ValidationResult =>
		(!Number.isNaN(Number.parseFloat(String(v))) &&
			Number.isFinite(Number(v))) ||
		'Debe ser un número',
};
