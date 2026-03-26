pipeline {
    agent any

    tools {
        nodejs 'Node-20'
    }

    environment {
        CI = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:run'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        // Uncomment and configure when deploy target is decided
        // stage('Deploy') {
        //     when {
        //         anyOf {
        //             branch 'release/1.0'
        //             branch 'master'
        //         }
        //     }
        //     steps {
        //         // Option A: Deploy to Nginx server
        //         // sh 'rsync -avz --delete dist/ user@server:/var/www/sprint-tracker/'
        //
        //         // Option B: Deploy to AWS S3
        //         // sh 'aws s3 sync dist/ s3://your-bucket-name --delete'
        //
        //         // Option C: Deploy via Docker
        //         // sh 'docker build -t sprint-tracker .'
        //         // sh 'docker run -d -p 80:80 sprint-tracker'
        //     }
        // }
    }

    post {
        success {
            echo 'Build succeeded!'
        }
        failure {
            echo 'Build failed!'
        }
        always {
            cleanWs()
        }
    }
}
