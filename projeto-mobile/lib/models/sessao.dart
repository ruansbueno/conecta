import 'usuario.dart';

/// Sessão autenticada. Vive só no cofre seguro; a senha nunca entra aqui (RM-02).
class Sessao {
  const Sessao({required this.accessToken, required this.expiraEm, required this.usuario});

  factory Sessao.fromLogin(Map<String, dynamic> json, {DateTime? agora}) => Sessao(
    accessToken: json['access_token'] as String,
    // Informativo: quem decide a validade é a API, pelo 401 (RM-04).
    expiraEm: (agora ?? DateTime.now().toUtc()).add(Duration(seconds: json['expires_in'] as int)),
    usuario: Usuario.fromJson(json['usuario'] as Map<String, dynamic>),
  );

  final String accessToken;
  final DateTime expiraEm;
  final Usuario usuario;
}
