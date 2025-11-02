package com.closeai.ecoprompt.common;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class CustomUtil {

    public static String dateConverter(LocalDateTime time) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");

        return time.format(formatter);
    }
}
