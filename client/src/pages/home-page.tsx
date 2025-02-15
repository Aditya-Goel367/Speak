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
import { LogOut, Plus, Video } from "lucide-react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: rooms = [] } = useQuery<Room[]>({ 
    queryKey: ["/api/rooms"]
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

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Video className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Video Chat Platform</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Welcome, {user?.username}</span>
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
            {rooms.map(room => (
              <Card key={room.id} className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => setLocation(`/room/${room.id}`)}>
                <CardHeader>
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created by {room.ownerId === user?.id ? "you" : "another user"}
                  </p>
                </CardContent>
              </Card>
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
