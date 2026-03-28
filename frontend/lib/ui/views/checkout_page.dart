import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../api/api_client.dart';
import '../../blocs/auth_provider.dart';

class CheckoutPage extends ConsumerStatefulWidget {
  final String eventId;
  const CheckoutPage({super.key, required this.eventId});

  @override
  ConsumerState<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends ConsumerState<CheckoutPage> {
  Map<String, dynamic>? event;
  bool isProcessing = false;
  int ticketCount = 1;

  @override
  void initState() {
    super.initState();
    _loadEvent();
  }

  Future<void> _loadEvent() async {
    try {
      final response = await eventApi.get('/events/${widget.eventId}');
      setState(() {
        event = response.data;
      });
    } catch (e) {
      debugPrint("Error loading checkout event: $e");
    }
  }

  Future<void> _processPayment() async {
    final auth = ref.read(authProvider);
    if (!auth.isAuthenticated) {
       // Navigate to login
       return;
    }

    setState(() => isProcessing = true);

    try {
      // 1. Create Payment Intent via Payment Service
      final amount = (event!['price'] ?? 0.0) * ticketCount;
      final response = await paymentApi.post('/payments/create-intent', data: {
        'user_id': '00000000-0000-0000-0000-000000000001', // Mock for now
        'event_id': widget.eventId,
        'amount': amount,
        'currency': 'usd',
        'metadata': {'ticket_count': ticketCount}
      });

      if (response.statusCode == 201) {
        // Wait and simulate success/failure for the demo
        await Future.delayed(const Duration(seconds: 3));
        
        // 2. Issuing the virtual ticket via Ticketing Service (Placeholder call)
        // await ticketApi.post('/tickets/issue', ...);

        setState(() => isProcessing = false);
        _showSuccessDialog();
      }
    } catch (e) {
      debugPrint("Payment Processing Error: $e");
      setState(() => isProcessing = false);
      _showErrorSnackBar("Payment Failed: ${e.toString()}");
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Icon(Icons.check_circle, color: Colors.green, size: 64),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text("Order Confirmed!", style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            const Text("Your payment was processed successfully. We've sent your tickets via email.", textAlign: TextAlign.center),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => context.go('/'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text("Go to My Tickets"),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.redAccent));
  }

  @override
  Widget build(BuildContext context) {
    if (event == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final totalPrice = (event!['price'] ?? 0.0) * ticketCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text("Checkout", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(40),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
             // Order Details Left
             Expanded(
               flex: 2,
               child: _buildOrderDetails(totalPrice),
             ),
             const SizedBox(width: 48),
             // Payment Card Right
             Expanded(
               flex: 1,
               child: _buildPaymentCard(totalPrice),
             ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderDetails(double totalPrice) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Your Order", style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.bold)),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
          child: Column(
            children: [
              _buildProductRow(event!['title'], totalPrice),
              const Divider(height: 60),
              _buildSummaryRow("Subtotal", totalPrice),
              const SizedBox(height: 16),
              _buildSummaryRow("Service Fee", 2.50),
              const Divider(height: 60),
              _buildSummaryRow("Total", totalPrice + 2.50, isBold: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProductRow(String title, double price) {
    return Row(
      children: [
        Container(width: 100, height: 100, decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(16)), child: const Icon(Icons.event, color: Colors.grey, size: 40)),
        const SizedBox(width: 24),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("General Admission", style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
        Text("\$${price.toStringAsFixed(2)}", style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildSummaryRow(String label, double value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.outfit(fontSize: isBold ? 20 : 16, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text("\$${value.toStringAsFixed(2)}", style: GoogleFonts.outfit(fontSize: isBold ? 24 : 16, fontWeight: isBold ? FontWeight.bold : FontWeight.normal, color: isBold ? Colors.indigo : Colors.black)),
      ],
    );
  }

  Widget _buildPaymentCard(double totalPrice) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 40)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
           Text("Payment Method", style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
           const SizedBox(height: 24),
           _buildPaymentInputField("Cardhood Name", Icons.person_outline),
           const SizedBox(height: 16),
           _buildPaymentInputField("Card Number", Icons.credit_card_outlined),
           const SizedBox(height: 16),
           Row(children: [
             Expanded(child: _buildPaymentInputField("Expiry Date", Icons.calendar_today_outlined)),
             const SizedBox(width: 16),
             Expanded(child: _buildPaymentInputField("CVV", Icons.lock_outline)),
           ]),
           const SizedBox(height: 32),
           SizedBox(
             width: double.infinity,
             child: ElevatedButton(
               onPressed: isProcessing ? null : _processPayment,
               style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 24), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
               child: isProcessing 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text("Pay \$${(totalPrice + 2.50).toStringAsFixed(2)}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
             ),
           ),
           const SizedBox(height: 16),
           const Center(child: Text("Securely processed by Stripe", style: TextStyle(color: Colors.grey, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _buildPaymentInputField(String label, IconData icon) {
    return Container(
      decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey[200]!)),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextField(decoration: InputDecoration(hintText: label, border: InputBorder.none, icon: Icon(icon, size: 18, color: Colors.grey))),
    );
  }
}
