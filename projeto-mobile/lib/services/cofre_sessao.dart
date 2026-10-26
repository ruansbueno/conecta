import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// O mínimo para retomar a sessão: token, de quem é e quando expira (D4).
class SessaoGuardada {
  const SessaoGuardada({required this.token, required this.usuarioId, required this.expiraEm});

  final String token;
  final String usuarioId;
  final DateTime expiraEm;
}

/// Token no Keychain/Keystore via flutter_secure_storage (Princípio III). Nunca a senha.
class CofreSessao {
  const CofreSessao(this._storage);

  final FlutterSecureStorage _storage;

  static const _token = 'sessao.token';
  static const _usuarioId = 'sessao.usuario_id';
  static const _expiraEm = 'sessao.expira_em';

  Future<void> gravar(SessaoGuardada sessao) async {
    await _storage.write(key: _token, value: sessao.token);
    await _storage.write(key: _usuarioId, value: sessao.usuarioId);
    await _storage.write(key: _expiraEm, value: sessao.expiraEm.toIso8601String());
  }

  Future<SessaoGuardada?> ler() async {
    final token = await _storage.read(key: _token);
    final usuarioId = await _storage.read(key: _usuarioId);
    final expiraEm = await _storage.read(key: _expiraEm);
    if (token == null || usuarioId == null || expiraEm == null) return null;
    return SessaoGuardada(
      token: token,
      usuarioId: usuarioId,
      expiraEm: DateTime.parse(expiraEm).toUtc(),
    );
  }

  Future<void> apagar() async {
    await _storage.delete(key: _token);
    await _storage.delete(key: _usuarioId);
    await _storage.delete(key: _expiraEm);
  }
}
