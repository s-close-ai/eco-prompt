package com.closeai.ecoprompt.config;

import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import jakarta.annotation.PreDestroy;
import jakarta.validation.constraints.NotNull;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.util.Properties;

import static java.lang.System.exit;

@Slf4j
@Component
@Profile("dev")
@ConfigurationProperties(prefix = "ssh")
@Validated
@Setter
public class SshTunnelingInitializer {

    @NotNull
    private String remoteJumpHost;

    @NotNull 
    private String user;

    @NotNull 
    private int sshPort;

    @NotNull 
    private String privateKey;

    @NotNull 
    private int databasePort;
    private String rdsEndpoint;

    private Session session;

    @PreDestroy
    public void closeSSH() {
        if (session.isConnected())
            session.disconnect();
    }

    public Integer buildSshConnection() {

        Integer forwardedPort = null;

        try {
            log.info("{}@{}:{}:{} with privateKey",user, remoteJumpHost, sshPort, databasePort);

            log.info("start ssh tunneling..");
            JSch jSch = new JSch();

            log.info("creating ssh session");
            log.info("privateKey location : {}", privateKey);
            jSch.addIdentity(privateKey);  // 개인키
            session = jSch.getSession(user, remoteJumpHost, sshPort);  // 세션 설정
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            session.setConfig(config);
            log.info("complete creating ssh session");

            log.info("start connecting ssh connection");
            session.connect();  // ssh 연결
            log.info("success connecting ssh connection ");

            log.info("start forwarding");
            forwardedPort = session.setPortForwardingL(3307, rdsEndpoint, databasePort);
            log.info("successfully connected to database");

        } catch (Exception e){
            log.error("fail to make ssh tunneling");
            this.closeSSH();
            e.printStackTrace();
            exit(1);
        }

        return forwardedPort;
    }

}
