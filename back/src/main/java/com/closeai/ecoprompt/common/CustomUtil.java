package com.closeai.ecoprompt.common;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class CustomUtil {

    public static String dateConverter(LocalDateTime time) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");

        return time.format(formatter);
    }

    public static String makeNewUUID() {
        return UUID.randomUUID().toString();
    }

    public static int getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return Integer.parseInt((String) authentication.getPrincipal());
    }
}
