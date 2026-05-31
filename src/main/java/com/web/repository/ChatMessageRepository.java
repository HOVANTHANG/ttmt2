package com.web.repository;

import com.web.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByRoomIdOrderByIdAsc(Long roomId);

    @Query("select count(m.id) from ChatMessage m " +
           "where m.room.shop.id = :shopId " +
           "and m.senderId != :sellerId " +
           "and m.id > :lastSeenId")
    Long countMessagesForSellerSince(@Param("shopId") Long shopId, @Param("sellerId") Long sellerId, @Param("lastSeenId") Long lastSeenId);

    @Query("select coalesce(max(m.id), 0) from ChatMessage m " +
           "where m.room.shop.id = :shopId " +
           "and m.senderId != :sellerId")
    Long maxMessageIdForSeller(@Param("shopId") Long shopId, @Param("sellerId") Long sellerId);
}