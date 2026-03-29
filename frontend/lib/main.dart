import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:eventmind_platform/ui/views/discovery_page.dart';
import 'package:eventmind_platform/ui/views/event_detail_page.dart';
import 'package:eventmind_platform/ui/views/checkout_page.dart';
import 'package:eventmind_platform/ui/views/dashboard_page.dart';
import 'package:eventmind_platform/ui/views/chat_page.dart';
import 'package:eventmind_platform/ui/views/auth_page.dart';
import 'package:eventmind_platform/ui/views/organizer_dashboard_page.dart';
import 'package:eventmind_platform/ui/views/create_event_page.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';

void main() {
  runApp(const ProviderScope(child: EventMindApp()));
}

class EventMindApp extends ConsumerWidget {
  const EventMindApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp.router(
      title: 'EventMind Event Platform | AI-Powered',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D9488), // Turquoise
          primary: const Color(0xFF0D9488),
          secondary: const Color(0xFFF43F5E), // Keep Rose Accent
          surface: const Color(0xFFF9FAFB), // Off-White
        ),
        textTheme: GoogleFonts.outfitTextTheme(),
      ),
      routerConfig: _buildRouter(authState),
    );
  }

  GoRouter _buildRouter(AuthState auth) {
    return GoRouter(
      initialLocation: '/',
      redirect: (context, state) {
        final isAuth = auth.isAuthenticated;
        final path = state.uri.path;

        if (!isAuth && (path.startsWith('/checkout') || path.startsWith('/dashboard') || path.startsWith('/chat') || path.startsWith('/organizer'))) {
          return '/auth';
        }
        return null;
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const DiscoveryPage(),
        ),
        GoRoute(
          path: '/auth',
          builder: (context, state) => const AuthPage(isLogin: true),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const AuthPage(isLogin: false),
        ),
        GoRoute(
          path: '/event/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return EventDetailPage(eventId: id);
          },
        ),
        GoRoute(
          path: '/checkout/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return CheckoutPage(eventId: id);
          },
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardPage(),
        ),
        GoRoute(
          path: '/chat/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            final name = state.uri.queryParameters['name'] ?? 'Community Chat';
            return ChatPage(roomId: "event:$id", roomName: name);
          },
        ),
        GoRoute(
          path: '/organizer',
          builder: (context, state) => const OrganizerDashboardPage(),
        ),
        GoRoute(
          path: '/organizer/create',
          builder: (context, state) => const CreateEventPage(),
        ),
      ],
    );
  }
}
