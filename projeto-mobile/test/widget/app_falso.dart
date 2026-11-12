import 'package:conecta/app.dart';
import 'package:conecta/main.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:conecta/services/preferencia_tema.dart';
import 'package:conecta/ui/rotas_das_telas.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../apoio.dart';
import '../fixtures/fixtures.dart';

/// App inteiro sobre a API falsa, já com sessão de `aluno.teste` (perfil vem de [meJson]).
class AppFalso {
  final api = ApiFalsa();
  late final CacheLocal cache;
  late final CofreSessao cofre;
  late final PreferenciaTema preferencias;

  Future<void> preparar({String me = meJson}) async {
    await iniciarFormatos();
    registrarRotas();
    final (c, f) = await armazenamentosVazios();
    cache = c;
    cofre = f;
    preferencias = PreferenciaTema(await SharedPreferences.getInstance());
    await cofre.gravar(
      SessaoGuardada(
        token: 'tok',
        usuarioId: '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11',
        expiraEm: DateTime.utc(2030),
      ),
    );
    api.responder('GET /me', me);
  }

  Future<void> abrir(WidgetTester tester) async {
    await tester.pumpWidget(
      ConectaApp(
        dependencias: Dependencias(
          api: api.api,
          cache: cache,
          cofre: cofre,
          preferencias: preferencias,
        ),
      ),
    );
    await tester.pumpAndSettle();
  }
}
