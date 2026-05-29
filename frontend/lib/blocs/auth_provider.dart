import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../api/api_client.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? errorMessage;
  final String? userEmail;

  AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.errorMessage,
    this.userEmail,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? errorMessage,
    String? userEmail,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      userEmail: userEmail ?? this.userEmail,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final storage = const FlutterSecureStorage();

  AuthNotifier() : super(AuthState()) {
    _checkStatus();
  }

  Future<void> _checkStatus() async {
    state = state.copyWith(isLoading: true);
    final token = await storage.read(key: 'access_token');
    if (token != null) {
      final email = await storage.read(key: 'user_email');
      state = state.copyWith(isAuthenticated: true, isLoading: false, userEmail: email);
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await authApi.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        await storage.write(key: 'access_token', value: data['access_token']);
        await storage.write(key: 'refresh_token', value: data['refresh_token']);
        await storage.write(key: 'user_email', value: email);
        state = state.copyWith(
            isAuthenticated: true, isLoading: false, userEmail: email);
        return true;
      }
    } on DioException catch (e) {
      state = state.copyWith(
          isLoading: false,
          errorMessage: e.response?.data['detail'] ?? e.message);
    }
    return false;
  }

  Future<bool> register(String email, String password, String fullName) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await authApi.post('/auth/register', data: {
        'email': email,
        'password': password,
        'full_name': fullName,
        'role': 'user'
      });

      if (response.statusCode == 201) {
        // Success registration, now login
        return await login(email, password);
      }
    } on DioException catch (e) {
      state = state.copyWith(
          isLoading: false,
          errorMessage: e.response?.data['detail'] ?? e.message);
    }
    return false;
  }

  Future<bool> socialLogin(String provider) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      // Mocking provider social result for now
      final email = "mock_$provider@eventmind.ai";
      final name = "Social User ($provider)";

      final response = await authApi.post('/auth/social-login', data: {
        'email': email,
        'full_name': name,
        'provider': provider,
        'provider_id': 'mock_${provider}_id',
        'id_token': 'mock_token',
      });

      if (response.statusCode == 200) {
        final data = response.data;
        await storage.write(key: 'access_token', value: data['access_token']);
        await storage.write(key: 'refresh_token', value: data['refresh_token']);
        state = state.copyWith(
            isAuthenticated: true, isLoading: false, userEmail: email);
        return true;
      }
    } on DioException catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.message);
    }
    return false;
  }

  Future<void> logout() async {
    await storage.deleteAll();
    state = state.copyWith(isAuthenticated: false);
  }
}

// Global provider instance
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
