package com.closeai.ecoprompt.common;

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
}
