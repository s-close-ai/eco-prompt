package com.closeai.ecoprompt.mileage.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.mileage.model.entity.Mileage;

public interface MileageRepository extends JpaRepository<Mileage, Long> {

}
