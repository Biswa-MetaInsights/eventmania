import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import 'package:dio/dio.dart';

class EventState {
  final List<dynamic> events;
  final bool isLoading;
  final String? errorMessage;

  EventState({
    this.events = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  EventState copyWith({
    List<dynamic>? events,
    bool? isLoading,
    String? errorMessage,
  }) {
    return EventState(
      events: events ?? this.events,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class EventNotifier extends StateNotifier<EventState> {
  EventNotifier() : super(EventState()) {
    fetchEvents();
  }

  Future<void> fetchEvents({String? category, String? query}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await eventApi.get('/events/search', queryParameters: {
        'q': query,
        'category': category,
        'status': 'published',
      });

      if (response.statusCode == 200) {
        state = state.copyWith(events: response.data, isLoading: false);
      }
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    }
  }
}

class RecommendationNotifier extends StateNotifier<EventState> {
  final String userId;
  RecommendationNotifier(this.userId) : super(EventState()) {
    fetchRecommendations();
  }

  Future<void> fetchRecommendations() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await recoApi.get('/recommendations/for-you', queryParameters: {
        'user_id': userId,
      });

      if (response.statusCode == 200) {
        state = state.copyWith(events: response.data, isLoading: false);
      }
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    }
  }
}

// Global Providers
final eventProvider = StateNotifierProvider<EventNotifier, EventState>((ref) {
  return EventNotifier();
});

final recommendationProvider = StateNotifierProvider.family<RecommendationNotifier, EventState, String>((ref, userId) {
  return RecommendationNotifier(userId);
});
