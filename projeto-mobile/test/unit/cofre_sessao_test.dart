import 'package:conecta/services/cofre_sessao.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late CofreSessao cofre;

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    cofre = CofreSessao(const FlutterSecureStorage());
  });

  test('grava, lê e apaga a sessão guardada', () async {
    final guardada = SessaoGuardada(
      token: 'tok',
      usuarioId: 'u1',
      expiraEm: DateTime.utc(2026, 10, 26, 12),
    );

    await cofre.gravar(guardada);
    final lida = await cofre.ler();
    await cofre.apagar();

    expect(lida!.token, 'tok');
    expect(lida.usuarioId, 'u1');
    expect(lida.expiraEm, DateTime.utc(2026, 10, 26, 12));
    expect(await cofre.ler(), isNull);
  });

  test('sem sessão guardada devolve null', () async {
    expect(await cofre.ler(), isNull);
  });

  test('nada além de token, id e expiração é guardado (a senha nunca, RM-02)', () async {
    await cofre.gravar(SessaoGuardada(token: 't', usuarioId: 'u', expiraEm: DateTime.utc(2026)));

    final tudo = await const FlutterSecureStorage().readAll();

    expect(tudo.keys.toSet(), {'sessao.token', 'sessao.usuario_id', 'sessao.expira_em'});
  });
}
