from django.urls import path

from . import views

urlpatterns = [path("metadata/", views.MetadataView.as_view())]
for prefix, listing, detail, messages, image in [
    ("conversations/", views.ConversationsView, views.ConversationView, views.MessagesView, views.ImageView),
    (
        "guest/",
        views.GuestConversationsView,
        views.GuestConversationView,
        views.GuestMessagesView,
        views.GuestImageView,
    ),
    ("inbox/", views.InboxView, views.OperatorConversationView, views.OperatorMessagesView, views.OperatorImageView),
]:
    urlpatterns += [
        path(prefix, listing.as_view()),
        path(prefix + "<uuid:pk>/", detail.as_view()),
        path(prefix + "<uuid:pk>/messages/", messages.as_view()),
        path(prefix + "<uuid:pk>/messages/<int:message_id>/image/", image.as_view()),
    ]
