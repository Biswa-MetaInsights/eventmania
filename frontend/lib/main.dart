import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'ui/views/discovery_page.dart';
import 'ui/views/event_detail_page.dart';
import 'ui/views/checkout_page.dart';
import 'ui/views/dashboard_page.dart';
import 'ui/views/chat_page.dart';
import 'ui/views/auth_page.dart';
import 'ui/views/organizer_dashboard_page.dart'; // Added Import
import 'ui/views/create_event_page.dart'; // Added Import
import 'blocs/auth_provider.dart';

void main() {
  runApp(const ProviderScope(child: BiswaEventPlatform()));
}

class BiswaEventPlatform extends ConsumerWidget {
  const BiswaEventPlatform({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp.router(
      title: 'Biswa Event Platform | AI-Powered',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1), // Indigo Blue (Premium)
          primary: const Color(0xFF6366F1),
          secondary: const Color(0xFFF43F5E), // Rose (Accent)
          surface: Colors.white,
          background: const Color(0xFFF8FAFC), // Modern grey-blue background
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
        // Protected Routes: Checkout, Dashboard, Chat, Organizer
        final isAuth = auth.isAuthenticated;
        final path = state.uri.path;

        if (!isAuth && (path.startsWith('/checkout') || path.startsWith('/dashboard') || path.startsWith('/chat') || path.startsWith('/organizer'))) {
          return '/auth';
        }
        return null; // Don't redirect
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const DiscoveryPage(),
        ),
        // Auth Routes
        GoRoute(
          path: '/auth',
          builder: (context, state) => const AuthPage(isLogin: true),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const AuthPage(isLogin: false),
        ),
        // Dynamic Route for Event Details (PUBLIC)
        GoRoute(
          path: '/event/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return EventDetailPage(eventId: id);
          },
        ),
        // Route for Checkout (PROTECTED)
        GoRoute(
          path: '/checkout/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return CheckoutPage(eventId: id);
          },
        ),
        // Dashboard Route (PROTECTED)
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardPage(),
        ),
        // Real-time Chat Route (PROTECTED)
        GoRoute(
          path: '/chat/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            final name = state.uri.queryParameters['name'] ?? 'Community Chat';
            return ChatPage(roomId: "event:$id", roomName: name);
          },
        ),
        // Organizer Console (PROTECTED)
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

// Landing Discovery Page with premium aesthetics
class DiscoveryPage extends StatelessWidget {
  const DiscoveryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context),
          _buildHeroSection(context),
          _buildEventGrid(context),
        ],
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      backgroundColor: Colors.white.withOpacity(0.8),
      title: Text(
        'Biswa Events',
        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.indigo),
      ),
      actions: [
        TextButton(onPressed: () {}, child: const Text('Discover')),
        TextButton(onPressed: () {}, child: const Text('My Tickets')),
        const SizedBox(width: 10),
        ElevatedButton(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.indigo,
            foregroundColor: Colors.white,
          ),
          child: const Text('Sign In'),
        ),
        const SizedBox(width: 20),
      ],
    );
  }

  Widget _buildHeroSection(BuildContext context) {
    return SliverToBoxAdapter(
      child: Container(
        height: 400,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Discover Your Next Great Experience',
                style: GoogleFonts.outfit(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                maxWidth: 600,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(50),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 20,
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search for events, workshops, or AI summits...',
                    border: InputBorder.none,
                    icon: Icon(Icons.search, color: Colors.indigo),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEventGrid(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.all(40),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 20,
          mainAxisSpacing: 20,
          childAspectRatio: 0.8,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) => _buildEventCard(context, index),
          childCount: 6,
        ),
      ),
    );
  }

  Widget _buildEventCard(BuildContext context, int index) {
    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: Colors.white,
      child: InkWell(
        onTap: () {},
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  image: const DecorationImage(
                    image: NetworkImage('https://via.placeholder.com/400x300'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TECH SUMMIT 2026', style: TextStyle(color: Colors.indigo, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Agentic AI: The Future of Automation', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  const Text('Mar 28, 2026 • San Francisco', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('\$99.00', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.indigo.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text('AI Suggested', style: TextStyle(color: Colors.indigo, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Placeholder for Detail page
class EventDetailPage extends StatelessWidget {
  const EventDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: Text('Event Detail View')));
  }
}
