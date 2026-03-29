import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:eventmind_platform/api/api_client.dart';
import 'package:eventmind_platform/blocs/auth_provider.dart';

class EventDetailPage extends ConsumerStatefulWidget {
  final String eventId;
  const EventDetailPage({super.key, required this.eventId});

  @override
  ConsumerState<EventDetailPage> createState() => _EventDetailPageState();
}

class _EventDetailPageState extends ConsumerState<EventDetailPage> {
  Map<String, dynamic>? event;
  List<dynamic> reviews = [];
  Map<String, dynamic>? aggregates;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    try {
      final results = await Future.wait([
        eventApi.get('/events/${widget.eventId}'),
        reviewApi.get('/reviews/event/${widget.eventId}'),
        reviewApi.get('/reviews/event/${widget.eventId}/aggregates'),
      ]);

      setState(() {
        event = results[0].data;
        reviews = results[1].data;
        aggregates = results[2].data;
        isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading event detail: $e");
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (event == null) return const Scaffold(body: Center(child: Text("Event not found.")));

    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          _buildHeroHeader(context),
          _buildMainContent(context),
          const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
        ],
      ),
      bottomNavigationBar: _buildStickyBooking(context),
    );
  }

  Widget _buildHeroHeader(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 450,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Image.network('https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?q=80&w=1200', fit: BoxFit.cover),
            Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [Colors.black54, Colors.transparent], begin: Alignment.bottomCenter, end: Alignment.topCenter))),
          ],
        ),
      ),
      leading: IconButton(onPressed: () => Navigator.pop(context), icon: const CircleAvatar(backgroundColor: Colors.white, child: Icon(Icons.arrow_back, color: Colors.black))),
    );
  }

  Widget _buildMainContent(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 40),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Column (Details, Description, Reviews)
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   _buildTitleAndDescription(),
                   const Divider(height: 60),
                   _buildReviewsSection(),
                ],
              ),
            ),
            const SizedBox(width: 64),
            // Right Column (Details Sidebar)
            Expanded(
              flex: 1,
              child: _buildEventSidebar(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTitleAndDescription() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: Colors.indigo.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Text(event!['category']?.toUpperCase() ?? 'GENERAL', style: GoogleFonts.outfit(color: Colors.indigo, fontSize: 13, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(event!['title'], style: GoogleFonts.outfit(fontSize: 48, fontWeight: FontWeight.w800, height: 1.1)),
        const SizedBox(height: 32),
        Text('About this event', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        Text(event!['description'] ?? 'No description provided.', style: GoogleFonts.outfit(fontSize: 18, color: Colors.grey[700], height: 1.6)),
      ],
    );
  }

  Widget _buildEventSidebar() {
    final startDate = DateTime.parse(event!['start_date']);
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.grey[200]!), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 40, offset: const Offset(0, 10))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSidebarItem(Icons.calendar_today_rounded, "Date & Time", "${DateFormat('EEEE, MMM d').format(startDate)}\n${DateFormat('jm').format(startDate)}"),
          const SizedBox(height: 24),
          _buildSidebarItem(Icons.location_on_rounded, "Location", event!['location']?['address'] ?? 'Online Event'),
          const SizedBox(height: 24),
          _buildSidebarItem(Icons.workspace_premium_rounded, "Organizer", "EventMind Agent"),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(IconData icon, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.indigo.withOpacity(0.05), borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: Colors.indigo, size: 24)),
        const SizedBox(width: 16),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey[500])),
          const SizedBox(height: 4),
          Text(subtitle, style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 16)),
        ]),
      ],
    );
  }

  Widget _buildReviewsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Attendee Reviews', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold)),
            Row(
              children: [
                const Icon(Icons.star_rounded, color: Colors.amber, size: 24),
                const SizedBox(width: 4),
                Text("${aggregates?['average_rating'] ?? 0.0}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
                Text(" (${aggregates?['review_count'] ?? 0})", style: GoogleFonts.outfit(color: Colors.grey)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 32),
        if (reviews.isEmpty)
           const Text("No reviews yet. Be the first to attend and share your experience!")
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: reviews.length,
            itemBuilder: (context, index) {
              final review = reviews[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(backgroundColor: Colors.indigo[50], child: const Icon(Icons.person, color: Colors.indigo)),
                        const SizedBox(width: 12),
                        const Text("Verified Attendee", style: TextStyle(fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Row(children: List.generate(5, (i) => Icon(Icons.star_rounded, size: 16, color: i < review['rating'] ? Colors.amber : Colors.grey[200]))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(review['content'] ?? '', style: const TextStyle(fontSize: 16, height: 1.5)),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildStickyBooking(BuildContext context) {
    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(horizontal: 40),
      decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey[200]!))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Starting from", style: TextStyle(color: Colors.grey)),
              Text("${event!['price'] == 0 ? 'FREE' : '\$${event!['price']}'}", style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black)),
            ],
          ),
          ElevatedButton(
            onPressed: () => context.push('/checkout/${widget.eventId}'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 60, vertical: 24), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            child: Text("Book Now", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
          ),
        ],
      ),
    );
  }
}
