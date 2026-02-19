import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/authStore";
import Navbar from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff } from "lucide-react";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function CallRoom() {
  const { bookingId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Connecting...");
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);

  const roomId = `mentormatch-${bookingId}`;
  const peerId = user ? `${user.id}` : "";

  const isPolite = useCallback(
    (otherPeerId: string) => peerId > otherPeerId,
    [peerId]
  );

  const sendWs = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const createPeerConnection = useCallback(
    (targetId: string) => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWs({
            type: "ice-candidate",
            roomId,
            senderId: peerId,
            payload: { targetId, data: event.candidate },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case "connected":
            setConnectionStatus("Connected");
            break;
          case "disconnected":
            setConnectionStatus("Peer disconnected");
            break;
          case "failed":
            setConnectionStatus("Connection failed - try refreshing");
            break;
          case "connecting":
            setConnectionStatus("Connecting...");
            break;
        }
      };

      return pc;
    },
    [roomId, peerId, sendWs]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLocation("/auth");
      return;
    }

    cleanupRef.current = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setIsVideoOff(true);
        } catch {
          setConnectionStatus("Could not access camera or microphone");
          return;
        }
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/signaling`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cleanupRef.current) return;
        sendWs({ type: "join", roomId, senderId: peerId });
        setConnectionStatus("Waiting for the other person...");
      };

      ws.onmessage = async (event) => {
        if (cleanupRef.current) return;
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "peers": {
            if (msg.peers.length > 0) {
              const targetId = msg.peers[0];
              setRemotePeerId(targetId);
              const pc = createPeerConnection(targetId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendWs({
                type: "offer",
                roomId,
                senderId: peerId,
                payload: { targetId, data: offer },
              });
              setConnectionStatus("Connecting...");
            }
            break;
          }

          case "peer-joined": {
            setRemotePeerId(msg.peerId);
            setConnectionStatus("Peer joined, waiting for connection...");
            break;
          }

          case "offer": {
            const targetId = msg.senderId;
            setRemotePeerId(targetId);

            if (pcRef.current && pcRef.current.signalingState !== "stable") {
              if (!isPolite(targetId)) {
                return;
              }
              await pcRef.current.setLocalDescription({ type: "rollback" });
            }

            const pc =
              pcRef.current && pcRef.current.signalingState === "stable"
                ? pcRef.current
                : createPeerConnection(targetId);

            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendWs({
              type: "answer",
              roomId,
              senderId: peerId,
              payload: { targetId, data: answer },
            });
            break;
          }

          case "answer": {
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(
                new RTCSessionDescription(msg.payload)
              );
            }
            break;
          }

          case "ice-candidate": {
            if (pcRef.current) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.payload));
              } catch {
                // ignore failed ICE candidates
              }
            }
            break;
          }

          case "peer-left": {
            setConnectionStatus("The other person left the call");
            setRemotePeerId(null);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            if (pcRef.current) {
              pcRef.current.close();
              pcRef.current = null;
            }
            break;
          }
        }
      };

      ws.onclose = () => {
        if (!cleanupRef.current) {
          setConnectionStatus("Disconnected from server");
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
        }
      };
    };

    init();

    return () => {
      cleanupRef.current = true;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: "leave", roomId, senderId: peerId })
        );
        wsRef.current.close();
      }
      wsRef.current = null;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    };
  }, [bookingId, isAuthenticated, user, setLocation, createPeerConnection, roomId, peerId, sendWs, isPolite]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
      } catch {
        // user cancelled
      }
    }
  };

  const endCall = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "leave", roomId, senderId: peerId })
      );
      wsRef.current.close();
    }
    wsRef.current = null;
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-heading" data-testid="text-call-title">
                Mentorship Session
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-connection-status">
                {connectionStatus}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={endCall}
              className="gap-2"
              data-testid="button-end-call"
            >
              <PhoneOff className="w-4 h-4" /> End Call
            </Button>
          </div>

          <Card className="flex-1 overflow-hidden border-2 border-primary/20 shadow-xl relative min-h-[500px] bg-muted">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              data-testid="video-remote"
            />
            {!remotePeerId && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground text-lg font-medium">
                    Waiting for the other person to join...
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Both participants need to click "Join Call" from the dashboard
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
                data-testid="video-local"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleMute}
              data-testid="button-toggle-mute"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleVideo}
              data-testid="button-toggle-video"
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>

            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={toggleScreenShare}
              disabled={!remotePeerId}
              data-testid="button-toggle-screen-share"
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={endCall}
              data-testid="button-end-call-bottom"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
