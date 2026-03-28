import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:intl/intl.dart';
import '../../api/api_client.dart';
import '../../blocs/auth_provider.dart';

class ChatPage extends ConsumerStatefulWidget {
  final String roomId;
  final String roomName;
  
  const ChatPage({super.key, required this.roomId, required this.roomName});

  @override
  ConsumerState<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends ConsumerState<ChatPage> {
  late WebSocketChannel _channel;
  final TextEditingController _controller = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  final ScrollController _scrollController = ScrollController();
  bool isConnected = false;
  
  // Mock current user for the demo
  final String currentUserId = "00000000-0000-0000-0000-000000000001";

  @override
  void initState() {
    super.initState();
    _connectToChat();
  }

  void _connectToChat() {
    // Expected: ws://localhost:8007/chat/ws/{room_id}/{user_id}
    final wsUrl = "ws://localhost:8007/chat/ws/${widget.roomId}/$currentUserId";
    
    _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
    
    _channel.stream.listen((message) {
      final decoded = json.decode(message);
      setState(() {
        _messages.add(decoded);
        _scrollToBottom();
      });
    }, onDone: () {
      setState(() => isConnected = false);
    }, onError: (e) {
      debugPrint("WebSocket Error: $e");
    });

    setState(() => isConnected = true);
  }

  void _sendMessage() {
    if (_controller.text.isNotEmpty) {
      final msg = {
        "content": _controller.text,
        "message_type": "text"
      };
      _channel.sink.add(json.encode(msg));
      _controller.clear();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.roomName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
            Row(children: [
               const Icon(Icons.circle, size: 8, color: Colors.green),
               const SizedBox(width: 4),
               Text("Live Chat", style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey)),
            ]),
          ],
        ),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.people_outline)),
          const SizedBox(width: 12),
        ],
      ),
      body: Column(
        children: [
          Expanded(child: _buildMessageList()),
          _buildInputSection(),
        ],
      ),
    );
  }

  Widget _buildMessageList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(24),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final msg = _messages[index];
        final isMe = msg['sender_id'] == currentUserId;
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 24.0),
          child: Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMe) 
                Padding(
                  padding: const EdgeInsets.only(left: 12, bottom: 4),
                  child: Text("Attendee ${msg['sender_id'].substring(0, 4)}", style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey[600], fontWeight: FontWeight.bold)),
                ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: isMe ? Colors.indigo : Colors.grey[100],
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20),
                    topRight: const Radius.circular(20),
                    bottomLeft: Radius.circular(isMe ? 20 : 0),
                    bottomRight: Radius.circular(isMe ? 0 : 20),
                  ),
                ),
                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                child: Text(
                  msg['content'] ?? '',
                  style: GoogleFonts.outfit(color: isMe ? Colors.white : Colors.black, fontSize: 16),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                DateFormat('jm').format(DateTime.now()), // Mock time
                style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey[400]),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInputSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey[200]!))),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(color: Colors.grey[50], borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey[200]!)),
              child: TextField(
                controller: _controller,
                onSubmitted: (_) => _sendMessage(),
                decoration: InputDecoration(
                  hintText: "Send a message to attendees...",
                  border: InputBorder.none,
                  hintStyle: GoogleFonts.outfit(color: Colors.grey[400]),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          CircleAvatar(
            backgroundColor: Colors.indigo,
            radius: 28,
            child: IconButton(
              onPressed: _sendMessage,
              icon: const Icon(Icons.send_rounded, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}
