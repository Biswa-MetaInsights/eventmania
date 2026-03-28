import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  late Dio dio;
  final storage = const FlutterSecureStorage();

  ApiClient(String baseUrl) {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add JWT Interceptor
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          // Handle Logout or Refresh Token logic here
        }
        return handler.next(e);
      },
    ));
  }

  // Generic methods for REST calls
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return await dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await dio.post(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return await dio.patch(path, data: data);
  }
}

// Global Gateway URL
const String gatewayUrl = 'http://localhost:8000';

// Unified Service Endpoints through Gateway
final authApi = ApiClient('$gatewayUrl/auth');
final userApi = ApiClient('$gatewayUrl/user');
final eventApi = ApiClient('$gatewayUrl/event');
final ticketApi = ApiClient('$gatewayUrl/ticket');
final paymentApi = ApiClient('$gatewayUrl/payment');
final notificationApi = ApiClient('$gatewayUrl/notification');
final chatApi = ApiClient('$gatewayUrl/chat');
final recoApi = ApiClient('$gatewayUrl/recommendation');
final reviewApi = ApiClient('$gatewayUrl/review');
