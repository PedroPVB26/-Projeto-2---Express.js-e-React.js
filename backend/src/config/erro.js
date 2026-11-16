export class AppError extends Error {
    constructor(statusCode, mensagem, campos = {}) {
        super(mensagem);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.campos = campos;
    }
}