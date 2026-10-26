import 'package:flutter/foundation.dart';

import 'json.dart';
import 'turma.dart';

enum Perfil { administrador, coordenacao, docente, aluno, desconhecido }

const _particulas = {'de', 'da', 'do', 'das', 'dos', 'e'};

/// Iniciais para o avatar: primeiro e último nome, ignorando partículas ("de", "do"…).
String iniciaisDe(String nome) {
  final partes = nome
      .trim()
      .split(RegExp(r'\s+'))
      .where((p) => p.isNotEmpty && !_particulas.contains(p.toLowerCase()))
      .toList();
  if (partes.isEmpty) return '?';
  if (partes.length == 1) {
    final unica = partes.single;
    return unica.substring(0, unica.length < 2 ? unica.length : 2).toUpperCase();
  }
  return (partes.first[0] + partes.last[0]).toUpperCase();
}

class Usuario {
  const Usuario({
    required this.id,
    required this.username,
    required this.nome,
    required this.perfil,
    required this.perfilBruto,
    this.turmas,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) => Usuario(
    id: json['id'] as String,
    username: json['username'] as String,
    nome: json['nome'] as String,
    perfil: enumPorNome(Perfil.values, json['perfil'], Perfil.desconhecido),
    perfilBruto: json['perfil'] as String? ?? '',
    turmas: json['turmas'] == null
        ? null
        : [
            for (final t in json['turmas'] as List)
              TurmaVinculada.fromJson(t as Map<String, dynamic>),
          ],
  );

  final String id;
  final String username;
  final String nome;
  final Perfil perfil;

  /// Valor recebido da API, exibido quando o perfil é novo para o app.
  final String perfilBruto;

  /// `null` quando a resposta não traz turmas (login); lista em GET /me.
  final List<TurmaVinculada>? turmas;

  String get iniciais => iniciaisDe(nome);

  /// Conveniência para esconder controles; quem recusa de fato é a API (RM-20).
  bool get podeSolicitarInscricao => perfil == Perfil.aluno;

  @override
  bool operator ==(Object other) =>
      other is Usuario &&
      other.id == id &&
      other.username == username &&
      other.nome == nome &&
      other.perfil == perfil &&
      other.perfilBruto == perfilBruto &&
      listEquals(other.turmas, turmas);

  @override
  int get hashCode => Object.hash(
    id,
    username,
    nome,
    perfil,
    perfilBruto,
    turmas == null ? null : Object.hashAll(turmas!),
  );
}
