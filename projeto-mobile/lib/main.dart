import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'config/ambiente.dart';
import 'services/api_client.dart';
import 'services/cache_local.dart';
import 'services/cofre_sessao.dart';
import 'ui/avisos/detalhe_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await iniciarFormatos();
  registrarRotas();
  runApp(ConectaApp(dependencias: await dependenciasReais()));
}

Future<void> iniciarFormatos() async {
  Intl.defaultLocale = 'pt_BR';
  await initializeDateFormatting('pt_BR');
}

Future<Dependencias> dependenciasReais({String baseUrl = Ambiente.apiBaseUrl}) async =>
    Dependencias(
      api: ApiClient(client: http.Client(), baseUrl: baseUrl),
      cache: CacheLocal(await SharedPreferences.getInstance()),
      cofre: const CofreSessao(FlutterSecureStorage()),
    );
