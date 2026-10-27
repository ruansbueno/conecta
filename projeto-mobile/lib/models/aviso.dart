import 'package:flutter/foundation.dart';

import 'destino.dart';
import 'json.dart';

enum SituacaoAviso { ativo, arquivado, desconhecido }

const _tamanhoTrecho = 160;

class Aviso {
  const Aviso({
    required this.id,
    required this.titulo,
    required this.conteudo,
    required this.autorId,
    required this.autorNome,
    required this.publicadoEm,
    required this.editadoEm,
    required this.situacao,
    required this.destinos,
  });

  factory Aviso.fromJson(Map<String, dynamic> json) {
    final autor = json['autor'] as Map<String, dynamic>;
    return Aviso(
      id: json['id'] as String,
      titulo: json['titulo'] as String,
      conteudo: json['conteudo'] as String,
      autorId: autor['id'] as String,
      autorNome: autor['nome'] as String,
      publicadoEm: data(json['publicado_em']),
      editadoEm: dataOuNulo(json['editado_em']),
      situacao: enumPorNome(SituacaoAviso.values, json['situacao'], SituacaoAviso.desconhecido),
      destinos: [
        for (final d in json['destinos'] as List) Destino.fromJson(d as Map<String, dynamic>),
      ],
    );
  }

  final String id;
  final String titulo;
  final String conteudo;
  final String autorId;
  final String autorNome;
  final DateTime publicadoEm;
  final DateTime? editadoEm;
  final SituacaoAviso situacao;
  final List<Destino> destinos;

  bool get foiEditado => editadoEm != null;

  /// Primeiros 160 caracteres, cortados em limite de palavra, para a lista.
  String get trecho {
    final texto = conteudo.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (texto.length <= _tamanhoTrecho) return texto;
    final corte = texto.lastIndexOf(' ', _tamanhoTrecho);
    return '${texto.substring(0, corte > 0 ? corte : _tamanhoTrecho).trimRight()}…';
  }

  @override
  bool operator ==(Object other) =>
      other is Aviso &&
      other.id == id &&
      other.titulo == titulo &&
      other.conteudo == conteudo &&
      other.autorId == autorId &&
      other.autorNome == autorNome &&
      other.publicadoEm == publicadoEm &&
      other.editadoEm == editadoEm &&
      other.situacao == situacao &&
      listEquals(other.destinos, destinos);

  @override
  int get hashCode => Object.hash(
    id,
    titulo,
    conteudo,
    autorId,
    autorNome,
    publicadoEm,
    editadoEm,
    situacao,
    Object.hashAll(destinos),
  );
}
