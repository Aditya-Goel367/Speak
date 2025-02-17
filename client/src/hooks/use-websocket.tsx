import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketMessage, User } from "@shared/schema";
import { useAuth } from "./use-auth";

interface Peer {
  connection: RTCPeerConnection;
  stream: MediaStream;
}

// Declare refs outside of the hook to avoid re-initialization
const wsRef = useRef<WebSocket | null>(null);
const localStreamRef = useRef<MediaStream | null>(null);

export function useWebSocket(roomId: number) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<Map<number, Peer>>(new Map());
  const [messages, setMessages] = useState<{ sender: User, text: string }[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const send = useCallback((msg: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const createPeerConnection = useCallback(async (targetId: number) => {
    if (!localStreamRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: "ice_candidate",
          target: targetId,
          candidate: event.candidate
        });
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
    };

    setPeers(prev => new Map(prev).set(targetId, {
      connection: pc,
      stream: remoteStream
    }));

    return pc;
  }, [send]);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data) as WebSocketMessage;

      switch (msg.type) {
        case "offer": {
          const pc = await createPeerConnection(msg.target);
          if (!pc) return;

          await pc.setRemoteDescription(msg.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          send({
            type: "answer",
            target: msg.target,
            answer
          });
          break;
        }

        case "answer": {
          const peer = peers.get(msg.target);
          if (peer) {
            await peer.connection.setRemoteDescription(msg.answer);
          }
          break;
        }

        case "ice_candidate": {
          const peer = peers.get(msg.target);
          if (peer) {
            await peer.connection.addIceCandidate(msg.candidate);
          }
          break;
        }

        case "chat_message": {
          const sender = users.find(u => u.id === msg.target);
          if (sender) {
            setMessages(prev => [...prev, { sender, text: msg.message }]);
          }
          break;
        }

        case "room_users": {
          setUsers(msg.users);

          // Create peer connections with new users
          const newUsers = msg.users.filter(u =>
            u.id !== user.id && !peers.has(u.id)
          );

          for (const newUser of newUsers) {
            const pc = await createPeerConnection(newUser.id);
            if (!pc) continue;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            send({
              type: "offer",
              target: newUser.id,
              offer
            });
          }
          break;
        }
      }
    };

    ws.onopen = () => {
      send({ type: "join_room", roomId });
    };

    return () => {
      send({ type: "leave_room", roomId });
      ws.close();
      peers.forEach(peer => {
        peer.connection.close();
      });
      setPeers(new Map());
    };
  }, [user, roomId, createPeerConnection, send, peers]);

  return {
    peers,
    messages,
    users,
    sendMessage: (message: string) => {
      if (!user) return;
      send({
        type: "chat_message",
        roomId,
        message
      });
      setMessages(prev => [...prev, { sender: user, text: message }]);
    }
  };
}
