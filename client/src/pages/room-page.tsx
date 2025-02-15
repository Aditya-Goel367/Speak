import { useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useVideo } from "@/hooks/use-video";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { type Room } from "@shared/schema";
import { ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, Send, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField } from "@/components/ui/form";

const messageSchema = z.object({
  message: z.string().min(1),
});

type MessageForm = z.infer<typeof messageSchema>;

export default function RoomPage() {
  const { id } = useParams();
  const roomId = parseInt(id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { stream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useVideo();
  const { peers, messages, users, sendMessage } = useWebSocket(roomId);
  
  const { data: room } = useQuery<Room>({
    queryKey: [`/api/rooms/${roomId}`],
    enabled: !isNaN(roomId),
  });

  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  // Set up local video stream
  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!room || !user) return null;

  const handleSendMessage = (data: MessageForm) => {
    sendMessage(data.message);
    messageForm.reset();
  };

  return (
    <div className="min-h-screen grid grid-cols-[1fr_300px]">
      <div className="p-8 flex flex-col">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rooms
          </Button>
          <h1 className="text-2xl font-bold">{room.name}</h1>
        </header>

        <div className="grid gap-4 flex-1 grid-cols-2 auto-rows-fr">
          <Card className="relative overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="icon"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? (
                  <VideoIcon className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="absolute top-4 left-4 bg-background/80 px-2 py-1 rounded text-sm">
              You
            </div>
          </Card>

          {Array.from(peers.entries()).map(([peerId, peer]) => (
            <Card key={peerId} className="relative overflow-hidden">
              <video
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                srcObject={peer.stream}
              />
              <div className="absolute top-4 left-4 bg-background/80 px-2 py-1 rounded text-sm">
                {users.find((u) => u.id === peerId)?.username}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-l flex flex-col">
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {users.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {participant.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {participant.username}
                    {participant.id === user.id && " (you)"}
                  </span>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-4 ${
                  msg.sender.id === user.id ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.sender.id === user.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-xs mb-1">
                    {msg.sender.id === user.id ? "You" : msg.sender.username}
                  </div>
                  <div className="break-words">{msg.text}</div>
                </div>
              </div>
            ))}
          </ScrollArea>

          <Card className="rounded-none border-x-0 border-b-0">
            <CardContent className="p-4">
              <Form {...messageForm}>
                <form
                  onSubmit={messageForm.handleSubmit(handleSendMessage)}
                  className="flex gap-2"
                >
                  <FormField
                    control={messageForm.control}
                    name="message"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          placeholder="Type a message..."
                          className="flex-1"
                          {...field}
                        />
                      </FormControl>
                    )}
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
