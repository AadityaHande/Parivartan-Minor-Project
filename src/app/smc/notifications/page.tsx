'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Plus, Send, MapPin, Image as ImageIcon, Trash2, Construction, AlertTriangle, Wrench, Info, Loader2 } from 'lucide-react';
import { useCollection, useMemoFirebase, useUser } from '@/firebase';
import { useFirestore } from '@/firebase/provider';
import { collection, query, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Notification } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const typeConfig = {
  road_construction: { icon: Construction, label: 'Road Construction', color: 'bg-orange-500' },
  traffic_update: { icon: AlertTriangle, label: 'Traffic Update', color: 'bg-yellow-500' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'bg-blue-500' },
  general: { icon: Info, label: 'General', color: 'bg-gray-500' },
};

export default function NotificationsManagementPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('general');
  const [location, setLocation] = useState('');
  const [locationLink, setLocationLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const handleSubmit = async () => {
    if (!firestore || !user) return;
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Description is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      const notificationData = {
        title: title.trim() || 'SMC Update',
        description: description.trim(),
        type,
        location: location.trim() || null,
        locationLink: locationLink.trim() || null,
        imageUrl: imageUrl.trim() || null,
        createdAt: new Date().toISOString(),
        createdBy: user.displayName || user.email || 'Admin',
        isRead: false,
      };

      await addDocumentNonBlocking(collection(firestore, 'notifications'), notificationData);

      // Send SMS notifications to all citizens and workers
      try {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const phoneNumbers = Array.from(
          new Set(
            usersSnapshot.docs
              .map((userDoc) => userDoc.data())
              .filter((userData) => ['citizen', 'worker', 'official'].includes(userData.role))
              .map((userData) => userData.phoneNumber)
              .filter((phone): phone is string => typeof phone === 'string' && phone.trim().length > 0)
              .map((phone) => phone.trim())
          )
        );

        const smsResponse = await fetch('/api/notifications/send-sms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: notificationData.title,
            description: notificationData.description,
            location: notificationData.location,
            phoneNumbers,
          }),
        });

        if (smsResponse.ok) {
          const smsData = await smsResponse.json();
          console.log('SMS sent successfully:', smsData);
        } else {
          console.warn('Failed to send SMS:', await smsResponse.text());
        }
      } catch (smsError) {
        console.error('Error sending SMS notifications:', smsError);
      }

      toast({
        title: 'Notification Sent',
        description: 'All citizens and workers have been notified via notification and SMS.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setType('general');
      setLocation('');
      setLocationLink('');
      setImageUrl('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send notification' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'notifications', id));
      toast({ title: 'Deleted', description: 'Notification has been removed' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete notification' });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Send alerts to all citizens and workers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Send New Alert</DialogTitle>
              <DialogDescription>
                This notification will be sent to all citizens and workers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Road Construction Notice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road_construction">Road Construction</SelectItem>
                    <SelectItem value="traffic_update">Traffic Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the update or alert..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Main Road, near City Center"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationLink">Google Maps Link (Optional)</Label>
                <Input
                  id="locationLink"
                  placeholder="https://maps.google.com/..."
                  value={locationLink}
                  onChange={(e) => setLocationLink(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Alert
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sent Notifications</CardTitle>
          <CardDescription>History of all alerts sent to citizens and workers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}

            {!isLoading && notifications && notifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.general;
              const Icon = config.icon;

              return (
                <div key={notification.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  {notification.imageUrl ? (
                    <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={notification.imageUrl}
                        alt={notification.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`h-12 w-12 rounded-md flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {config.label}
                        </Badge>
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
                    {notification.location && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {notification.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {!isLoading && (!notifications || notifications.length === 0) && (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications sent yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
