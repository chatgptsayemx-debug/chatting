
class NotificationService {
  constructor() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

  show(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://picsum.photos/100/100' // Using placeholder for icon
      });
    }
  }
}

export const notificationService = new NotificationService();
