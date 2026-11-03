package com.planepeep.backend.repository;

import com.planepeep.backend.model.UserFavorite;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repository for accessing user favorites stored in the database.
 */
public interface FavoriteRepository extends JpaRepository<UserFavorite, Long> {
    List<UserFavorite> findByUser_UserIdOrderBySortOrderAscFavoriteIdAsc(Long userId);

    Optional<UserFavorite> findByUser_UserIdAndExternalItemId(Long userId, String externalItemId);

    Optional<UserFavorite> findByFavoriteIdAndUser_UserId(Long favoriteId, Long userId);

    @Modifying
    @Transactional
    @Query(
        """
        delete from UserFavorite uf
        where uf.user.userId = :userId
          and uf.externalItemId = :externalItemId
        """
    )
    int deleteByUserIdAndExternalItemId(
        @Param("userId") Long userId,
        @Param("externalItemId") String externalItemId
    );
}
