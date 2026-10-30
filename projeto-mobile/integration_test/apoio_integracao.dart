import 'package:conecta/app.dart';
import 'package:conecta/main.dart';
import 'package:conecta/services/cache_local.dart';
import 'package:conecta/services/cofre_sessao.dart';
import 'package:conecta/ui/rotas_das_telas.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'servidor_falso.dart';

/// Sobe o app real (cofre e preferências do aparelho) apontando para o servidor falso.
class AppSobTeste {
  AppSobTeste._(this.servidor, this.dependencias);

  final ServidorFalso servidor;
  final Dependencias dependencias;

  CofreSessao get cofre => dependencias.cofre;
  CacheLocal get cache => dependencias.cache;

  static Future<AppSobTeste> preparar() async {
    await iniciarFormatos();
    registrarRotas();
    await const FlutterSecureStorage().deleteAll();
    await (await SharedPreferences.getInstance()).clear();
    final servidor = await ServidorFalso.iniciar();
    return AppSobTeste._(servidor, await dependenciasReais(baseUrl: servidor.url));
  }

  /// Abre o app e espera a decisão inicial (login ou casca), que depende da rede real.
  Future<void> abrir(WidgetTester tester) async {
    await tester.pumpWidget(ConectaApp(dependencias: dependencias));
    await esperar(
      tester,
      find.byWidgetPredicate(
        (w) => w.key == const Key('barra-abas') || (w is Text && w.data == 'Entrar'),
      ),
    );
  }

  Future<void> entrar(WidgetTester tester, {String senha = 'senha-teste'}) async {
    await tester.enterText(find.byKey(const Key('campo-usuario')), 'aluno.teste');
    await tester.enterText(find.byKey(const Key('campo-senha')), senha);
    await tester.tap(find.text('Entrar'));
    await esperar(tester, find.byKey(const Key('barra-abas')));
  }

  Future<void> abrirAba(WidgetTester tester, String aba) async {
    await tester.tap(
      find.descendant(of: find.byKey(const Key('barra-abas')), matching: find.text(aba)),
    );
    await tester.pumpAndSettle();
  }

  Future<void> encerrar() => servidor.parar();
}

/// No aparelho a rede é real: `pumpAndSettle` não espera a resposta HTTP. Bombeia quadros até
/// o [alvo] aparecer ou o tempo acabar. O limite é folgado porque a primeira tela depois da
/// instalação do app no emulador às vezes passou dos 10 s.
Future<void> esperar(
  WidgetTester tester,
  Finder alvo, {
  Duration limite = const Duration(seconds: 20),
}) async {
  final fim = DateTime.now().add(limite);
  while (DateTime.now().isBefore(fim)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (alvo.evaluate().isNotEmpty) {
      await tester.pumpAndSettle();
      return;
    }
  }
  throw TestFailure('Tempo esgotado esperando $alvo');
}
