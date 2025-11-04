package com.closeai.ecoprompt.mileage.repository;

import java.util.Optional;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.mileage.model.entity.Mileage;

public interface MileageRepository extends JpaRepository<Mileage, Long> {

	Optional<Mileage> findByMessage_Id(Long messageId);
}
