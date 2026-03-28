import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../blocs/event_provider.dart';
import '../../blocs/auth_provider.dart';
import '../components/event_card.dart';

class DiscoveryPage extends ConsumerWidget {
  const DiscoveryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventState = ref.watch(eventProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context, ref, authState),
          _buildHeroSection(context, ref),
          _buildSectionHeader(context, "Upcoming Events"),
          _buildEventGrid(context, eventState),
          const SliverPadding(padding: EdgeInsets.only(bottom: 60)),
        ],
      ),
    );
  }

  Widget _buildAppBar(BuildContext context, WidgetRef ref, AuthState auth) {
    return SliverAppBar(
      floating: true,
      pinned: true,
      backgroundColor: Colors.white.withOpacity(0.9),
      surfaceTintColor: Colors.transparent,
      title: Row(
        children: [
          const Icon(Icons.flash_on, color: Colors.indigo),
          const SizedBox(width: 8),
          Text(
            'BISWA',
            style: GoogleFonts.outfit(fontWeight: FontWeight.w900, color: Colors.black, letterSpacing: 1.5),
          ),
        ],
      ),
      actions: [
        if (!auth.isAuthenticated)
          ElevatedButton(
            onPressed: () => context.push('/auth'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.indigo,
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Sign In', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          )
        else
          IconButton(
            onPressed: () => context.push('/dashboard'), 
            icon: const Icon(Icons.account_circle_outlined, size: 28)
          ),
        const SizedBox(width: 24),
      ],
    );
  }

  Widget _buildHeroSection(BuildContext context, WidgetRef ref) {
    return SliverToBoxAdapter(
      child: Container(
        height: 380,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF4F46E5), Color(0xFF4338CA)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Experience the Extraordinary.',
                style: GoogleFonts.outfit(
                  fontSize: 56,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'AI-powered events & networking summits matched to your passions.',
                style: GoogleFonts.outfit(
                  fontSize: 20,
                  color: Colors.white.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 48),
              
              // Search Bar
              Container(
                maxWidth: 680,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.15),
                      blurRadius: 30,
                      offset: const Offset(0, 15),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: TextField(
                  onChanged: (val) {
                    ref.read(eventProvider.notifier).fetchEvents(query: val);
                  },
                  decoration: InputDecoration(
                    hintText: 'Search coding bootcamps, AI summits, or design workshops...',
                    hintStyle: GoogleFonts.outfit(color: Colors.grey[400]),
                    border: InputBorder.none,
                    icon: const Icon(Icons.search, color: Colors.indigo),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(40, 48, 40, 24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B))),
            TextButton(
              onPressed: () {},
              child: Text('View All', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, color: Colors.indigo)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEventGrid(BuildContext context, EventState state) {
    if (state.isLoading) {
      return const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(100.0), child: CircularProgressIndicator())));
    }

    if (state.events.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(100.0),
            child: Text('No events matching your search yet.', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 24,
          mainAxisSpacing: 24,
          childAspectRatio: 0.85,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final event = state.events[index];
            return EventCard(
              event: event,
              onTap: () {
                final id = event['id'];
                GoRouter.of(context).push('/event/$id');
              },
            );
          },
          childCount: state.events.length,
        ),
      ),
    );
  }
}
