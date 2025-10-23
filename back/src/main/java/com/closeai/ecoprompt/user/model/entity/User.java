package com.closeai.ecoprompt.user.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "`user`") // 예약어 회피
public class User extends BaseEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id; // BIGINT/INT 혼재 가능, 일단 Long 권장

    @Column(name = "employee_number", length = 10, nullable = false)
    private String employeeNumber;

    @Column(name = "email", length = 320, nullable = false)
    private String email;

    @Column(name = "name", length = 20, nullable = false)
    private String name;

    @Column(name = "project_id", nullable = false)
    private Integer projectId; // DDL상 정수 컬럼. 실제로는 Project FK가 따로 있으므로 나중에 정리 권장
}
