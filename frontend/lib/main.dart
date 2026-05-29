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

// Bridges Riverpod auth state into a ChangeNotifier so GoRouter can
// re-evaluate redirects without being recreated (which would reset to '/').
class _RouterNotifier extends ChangeNotifier {
  final Ref _ref;
  _RouterNotifier(this._ref) {
    _ref.listen<AuthState>(authProvider, (_, __) => notifyListeners());
  }

  String? redirect(BuildContext context, GoRouterState state) {
    final isAuth = _ref.read(authProvider).isAuthenticated;
    final path = state.uri.path;
    if (!isAuth &&
        (path.startsWith('/checkout') ||
            path.startsWith('/dashboard') ||
            path.startsWith('/chat') ||
            path.startsWith('/organizer'))) {
      return '/auth';
    }
    return null;
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final notifier = _RouterNotifier(ref);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: notifier,
    redirect: notifier.redirect,
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
});

class EventMindApp extends ConsumerWidget {
  const EventMindApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'EventMind Event Platform | AI-Powered',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF2EFEA),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF184E4A),
          primary: const Color(0xFF184E4A),
          secondary: const Color(0xFF2D7D78),
          surface: const Color(0xFFF2EFEA),
        ),
        textTheme: GoogleFonts.outfitTextTheme(),
      ),
      routerConfig: router,
    );
  }
}
