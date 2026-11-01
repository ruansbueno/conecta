import 'package:flutter/foundation.dart';

import 'destino.dart';
import 'json.dart';

/// Tipos da E3; valor novo da API vira [desconhecido] e é exibido como veio.
enum TipoEvento {
  palestra('palestra', 'Palestra'),
  banca('banca', 'Banca'),
  reuniao('reuniao', 'Reunião'),
  formatura('formatura', 'Formatura'),
  prova('prova', 'Prova'),
  dataImportante('data_importante', 'Data importante'),
  outro('outro', 'Outro'),
  desconhecido('', 'Evento');

  const TipoEvento(this.valorApi, this.rotulo);

  /// Como a API escreve o tipo (`data_importante`), também usado no filtro `tipo=`.
  final String valorApi;
  final String rotulo;

  /// Tipos que a pessoa pode escolher no filtro.
  static List<TipoEvento> get conhecidos => values.where((t) => t != desconhecido).toList();

  static TipoEvento daApi(Object? valor) => values.firstWhere(
    (t) => t != desconhecido && t.valorApi == valor,
    orElse: () => desconhecido,
  );
}

/// Evento da agenda, como a API devolve: o app não decide quem o vê (Princípio I).
class Evento {
  const Evento({
    required this.id,
    required this.titulo,
    required this.descricao,
    required this.tipo,
    required this.tipoBruto,
    required this.inicio,
    required this.fim,
    required this.local,
    required this.autorNome,
    required this.editadoEm,
    required this.destinos,
  });

  factory Evento.fromJson(Map<String, dynamic> json) {
    final autor = json['autor'] as Map<String, dynamic>;
    return Evento(
      id: json['id'] as String,
      titulo: json['titulo'] as String,
      descricao: json['descricao'] as String?,
      tipo: TipoEvento.daApi(json['tipo']),
      tipoBruto: json['tipo'] as String? ?? '',
      inicio: data(json['inicio']),
      fim: dataOuNulo(json['fim']),
      local: json['local'] as String?,
      autorNome: autor['nome'] as String,
      editadoEm: dataOuNulo(json['editado_em']),
      destinos: [
        for (final d in json['destinos'] as List) Destino.fromJson(d as Map<String, dynamic>),
      ],
    );
  }

  final String id;
  final String titulo;
  final String? descricao;
  final TipoEvento tipo;

  /// Valor recebido da API, exibido quando o tipo é novo para o app.
  final String tipoBruto;
  final DateTime inicio;
  final DateTime? fim;
  final String? local;
  final String autorNome;
  final DateTime? editadoEm;
  final List<Destino> destinos;

  String get rotuloTipo =>
      tipo == TipoEvento.desconhecido && tipoBruto.isNotEmpty ? tipoBruto : tipo.rotulo;

  /// O fim cai em outro dia, no fuso do aparelho. Terminar à meia-noite ainda é o mesmo dia.
  bool get variosDias {
    final f = fim;
    if (f == null) return false;
    final a = inicio.toLocal();
    final b = f.toLocal().subtract(const Duration(microseconds: 1));
    return b.isAfter(a) && (a.year != b.year || a.month != b.month || a.day != b.day);
  }

  @override
  bool operator ==(Object other) =>
      other is Evento &&
      other.id == id &&
      other.titulo == titulo &&
      other.descricao == descricao &&
      other.tipo == tipo &&
      other.tipoBruto == tipoBruto &&
      other.inicio == inicio &&
      other.fim == fim &&
      other.local == local &&
      other.autorNome == autorNome &&
      other.editadoEm == editadoEm &&
      listEquals(other.destinos, destinos);

  @override
  int get hashCode => Object.hash(
    id,
    titulo,
    descricao,
    tipo,
    tipoBruto,
    inicio,
    fim,
    local,
    autorNome,
    editadoEm,
    Object.hashAll(destinos),
  );
}
