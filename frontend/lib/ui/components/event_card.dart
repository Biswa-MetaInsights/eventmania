import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class EventCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final VoidCallback onTap;

  const EventCard({super.key, required this.event, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = event['title'] ?? 'Unknown Event';
    final category = event['category'] ?? 'General';
    final location = event['location']?['address'] ?? 'Online';
    final price = event['price'] ?? 0.0;
    final startDateStr = event['start_date'] ?? DateTime.now().toString();
    final startDate = DateTime.parse(startDateStr);
    
    // Formatting factors
    final formattedDate = DateFormat('MMM d, y').format(startDate);
    final formattedTime = DateFormat('jm').format(startDate);

    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Event Image
            Expanded(
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      image: const DecorationImage(
                        image: NetworkImage('https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?q=80&w=400'),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  // Price Tag Badge
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        price == 0 ? 'FREE' : '\$${price.toStringAsFixed(2)}',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.indigo),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // Event Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(category.toUpperCase(), style: GoogleFonts.outfit(color: Colors.indigo, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  const SizedBox(height: 6),
                  Text(
                    title, 
                    maxLines: 2, 
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, height: 1.2),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text('$formattedDate • $formattedTime', style: GoogleFonts.outfit(color: Colors.grey[600], fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                      const SizedBox(width: 6),
                      Text(location, style: GoogleFonts.outfit(color: Colors.grey[600], fontSize: 13)),
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
