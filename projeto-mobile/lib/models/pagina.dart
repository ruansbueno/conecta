import 'package:flutter/foundation.dart';

/// Envelope de toda lista paginada da API.
class Pagina<T> {
  const Pagina({
    required this.items,
    required this.total,
    required this.limit,
    required this.offset,
  });

  factory Pagina.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) item) =>
      Pagina(
        items: [for (final i in json['items'] as List) item(i as Map<String, dynamic>)],
        total: json['total'] as int,
        limit: json['limit'] as int,
        offset: json['offset'] as int,
      );

  final List<T> items;
  final int total;
  final int limit;
  final int offset;

  /// Único critério de fim de lista (RM-14).
  bool get temMais => offset + items.length < total;

  @override
  bool operator ==(Object other) =>
      other is Pagina<T> &&
      listEquals(other.items, items) &&
      other.total == total &&
      other.limit == limit &&
      other.offset == offset;

  @override
  int get hashCode => Object.hash(Object.hashAll(items), total, limit, offset);
}
