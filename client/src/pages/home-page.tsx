import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { insertRoomSchema, type Room } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { LogOut, Plus, Video, User } from "lucide-react";
import { motion } from 'framer-motion'; // Import framer-motion


const AnimatedCard = motion(Card); // Wrap Card with motion
const AnimatedButton = motion(Button); // Wrap Button with motion (Not used in this specific modification)


export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: rooms = [] } = useQuery<Room[]>({ 
    queryKey: ["/api/rooms"],
    enabled: !!user
  });

  const createRoomForm = useForm({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      name: "",
      isPrivate: false
    }
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: { name: string; isPrivate: boolean }) => {
      const res = await apiRequest("POST", "/api/rooms", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      createRoomForm.reset();
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <Video className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Welcome to Video Chat Platform</h1>
          <p className="text-muted-foreground mb-8">Connect with people worldwide through secure video calls</p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/auth")}>Sign Up</Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/room/1")}>
              Try it First (3 free calls)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Try the platform with up to 3 free video calls before signing up
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Video className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Speaklex</h1>
        </div>

        <div className="flex items-center gap-6">
          <Card className="flex items-center gap-4 p-4">
            <User className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-sm text-muted-foreground">Points: {user.points || 0}</p>
            </div>
          </Card>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create Room</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...createRoomForm}>
              <form onSubmit={createRoomForm.handleSubmit(data => createRoomMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={createRoomForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createRoomMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Rooms</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((room, index) => ( // Added index for animation delay
              <AnimatedCard // Use AnimatedCard
                key={room.id}
                className="cursor-pointer scale-up"
                onClick={() => setLocation(`/room/${room.id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }} //Staggered animation
                whileHover={{ scale: 1.02 }}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created by {room.ownerId === user.id ? "you" : "another user"}
                  </p>
                </CardContent>
              </AnimatedCard>
            ))}
          </div>

          {rooms.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No rooms available. Create one to get started!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}